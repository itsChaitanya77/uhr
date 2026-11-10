const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User, Patient, Doctor, MedicalRecord, Prescription, LabReport, Appointment, EmergencyAccessLog, AuditLog, Notification } = require('../models');
const { protect, requireRole, validate, validObjectId } = require('../middleware/auth');
const { wrap, escapeRegex, audit } = require('../utils/helpers');
const { adminDoctorSchema } = require('../utils/validators');

router.use(protect, requireRole('admin'));

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
function lastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(dayKey(Date.now() - i * 24 * 3600 * 1000));
  return out;
}

router.get('/stats', wrap(async (req, res) => {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const [patients, doctors, verified, records, rx, labs, appts, emergencyTotal, emergencyLogs, activity, recent, pendingReview] = await Promise.all([
    Patient.countDocuments(), Doctor.countDocuments(), Doctor.countDocuments({ verified: true }),
    MedicalRecord.countDocuments(), Prescription.countDocuments(), LabReport.countDocuments(), Appointment.countDocuments(),
    EmergencyAccessLog.countDocuments(),
    EmergencyAccessLog.find({ startedAt: { $gte: since } }).select('startedAt method doctorName review'),
    AuditLog.find({ createdAt: { $gte: since } }).select('createdAt action'),
    AuditLog.find().sort({ createdAt: -1 }).limit(8),
    EmergencyAccessLog.countDocuments({ 'review.status': 'pending' }),
  ]);
  const days = lastDays(14);
  const emergencyByDay = Object.fromEntries(days.map((d) => [d, 0]));
  const activityByDay = Object.fromEntries(days.map((d) => [d, 0]));
  emergencyLogs.forEach((l) => { const k = dayKey(l.startedAt); if (k in emergencyByDay) emergencyByDay[k] += 1; });
  activity.forEach((a) => { const k = dayKey(a.createdAt); if (k in activityByDay) activityByDay[k] += 1; });
  const byDoctor = {};
  emergencyLogs.forEach((l) => { byDoctor[l.doctorName] = (byDoctor[l.doctorName] || 0) + 1; });
  const now = new Date();
  const activeNow = await EmergencyAccessLog.countDocuments({ endedAt: null, expiresAt: { $gt: now } });

  res.json({
    totals: { patients, doctors, verifiedDoctors: verified, pendingDoctors: doctors - verified, records: records + rx + labs, appointments: appts, emergencyAccess: emergencyTotal, activeEmergencySessions: activeNow, pendingReview },
    recordsBreakdown: [{ name: 'Clinical notes', value: records }, { name: 'Prescriptions', value: rx }, { name: 'Lab & imaging', value: labs }],
    emergencyByDay: days.map((d) => ({ date: d, count: emergencyByDay[d] })),
    activityByDay: days.map((d) => ({ date: d, count: activityByDay[d] })),
    emergencyByDoctor: Object.entries(byDoctor).map(([name, count]) => ({ name, count })),
    emergencyByMethod: [{ name: 'QR scan', value: emergencyLogs.filter((l) => l.method === 'qr').length }, { name: 'UHR ID', value: emergencyLogs.filter((l) => l.method === 'uhr-id').length }],
    recentActivity: recent,
  });
}));

/* ----- users ----- */
router.get('/users', wrap(async (req, res) => {
  const { role, q, status } = req.query;
  const filter = {};
  if (['patient', 'doctor', 'admin'].includes(role)) filter.role = role;
  if (['active', 'suspended'].includes(status)) filter.status = status;
  if (q) { const rx = new RegExp(escapeRegex(String(q).slice(0, 60)), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  const ids = users.map((u) => u._id);
  const [patients, doctors] = await Promise.all([Patient.find({ user: { $in: ids } }).select('user uhrId'), Doctor.find({ user: { $in: ids } })]);
  const pMap = new Map(patients.map((p) => [String(p.user), p]));
  const dMap = new Map(doctors.map((d) => [String(d.user), d]));
  res.json({
    users: users.map((u) => ({
      ...u.toJSON(),
      uhrId: pMap.get(String(u._id))?.uhrId,
      doctor: dMap.get(String(u._id)) && (({ _id, licenseNumber, specialty, hospital, verified, permissions }) => ({ id: _id, licenseNumber, specialty, hospital, verified, permissions }))(dMap.get(String(u._id))),
    })),
  });
}));

router.put('/users/:id/status', validObjectId('id'), validate(z.object({ status: z.enum(['active', 'suspended']) })), wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot change your own account status' });
  user.status = req.valid.status;
  await user.save();
  await audit({ req, action: req.valid.status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', details: `${user.name} (${user.role})` });
  res.json({ user });
}));

router.post('/doctors', validate(adminDoctorSchema), wrap(async (req, res) => {
  const d = req.valid;
  if (await User.exists({ email: d.email })) return res.status(409).json({ message: 'Email already registered', errors: { email: 'Already registered' } });
  if (await Doctor.exists({ licenseNumber: d.licenseNumber })) return res.status(409).json({ message: 'License already registered', errors: { licenseNumber: 'Already registered' } });
  const user = await User.create({ name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12), role: 'doctor' });
  const doctor = await Doctor.create({ user: user._id, licenseNumber: d.licenseNumber, specialty: d.specialty, hospital: d.hospital });
  await audit({ req, action: 'DOCTOR_CREATED', details: `${user.name} (${d.licenseNumber}), pending verification` });
  res.status(201).json({ user, doctor });
}));

router.put('/doctors/:id/verify', validObjectId('id'), validate(z.object({ verified: z.boolean() })), wrap(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user', 'name');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  doctor.verified = req.valid.verified;
  doctor.verifiedAt = req.valid.verified ? new Date() : undefined;
  doctor.verifiedBy = req.valid.verified ? req.user._id : undefined;
  await doctor.save();
  await Notification.create({ user: doctor.user._id, type: 'info', title: doctor.verified ? 'Credentials verified' : 'Verification revoked', message: doctor.verified ? 'You can now access patient records.' : 'Your clinical access has been suspended.' });
  await audit({ req, action: doctor.verified ? 'DOCTOR_VERIFIED' : 'DOCTOR_UNVERIFIED', details: `${doctor.user.name} (${doctor.licenseNumber})` });
  res.json({ doctor });
}));

router.put('/doctors/:id/permissions', validObjectId('id'), validate(z.object({ prescribe: z.boolean().optional(), emergencyAccess: z.boolean().optional() })), wrap(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user', 'name');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  Object.assign(doctor.permissions, req.valid);
  await doctor.save();
  await audit({ req, action: 'PERMISSIONS_CHANGED', details: `${doctor.user.name}: ${JSON.stringify(req.valid)}` });
  res.json({ doctor });
}));

/* ----- audit + emergency review ----- */
router.get('/audit', wrap(async (req, res) => {
  const { action, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 25;
  const filter = {};
  if (action) filter.action = String(action).slice(0, 50);
  if (q) { const rx = new RegExp(escapeRegex(String(q).slice(0, 60)), 'i'); filter.$or = [{ actorName: rx }, { details: rx }]; }
  const [logs, total, actions] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate({ path: 'patient', select: 'uhrId' }),
    AuditLog.countDocuments(filter),
    AuditLog.distinct('action'),
  ]);
  res.json({ logs, total, page, pages: Math.max(1, Math.ceil(total / limit)), actions: actions.sort() });
}));

router.get('/emergency-logs', wrap(async (req, res) => {
  const logs = await EmergencyAccessLog.find().sort({ startedAt: -1 }).limit(100);
  const now = new Date();
  res.json({ logs: logs.map((l) => ({ ...l.toJSON(), active: !l.endedAt && l.expiresAt > now })) });
}));

router.put('/emergency-logs/:id/review', validObjectId('id'), validate(z.object({ status: z.enum(['justified', 'flagged']), note: z.string().trim().max(300).optional() })), wrap(async (req, res) => {
  const log = await EmergencyAccessLog.findById(req.params.id);
  if (!log) return res.status(404).json({ message: 'Log not found' });
  log.review = { status: req.valid.status, note: req.valid.note, reviewedBy: req.user._id, reviewedAt: new Date() };
  await log.save();
  await audit({ req, action: 'EMERGENCY_REVIEWED', patient: log.patient, details: `${log.doctorName} → ${req.valid.status}` });
  res.json({ log });
}));

module.exports = router;
