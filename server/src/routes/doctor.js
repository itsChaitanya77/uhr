const router = require('express').Router();
const { z } = require('zod');
const { Patient, MedicalRecord, Prescription, LabReport, Appointment, EmergencyContact, AuditLog, Notification, Doctor } = require('../models');
const { protect, requireRole, requireVerifiedDoctor, validate, validObjectId } = require('../middleware/auth');
const { upload, verifyMagicBytes } = require('../middleware/upload');
const { wrap, escapeRegex, audit, ageFromDob } = require('../utils/helpers');
const v = require('../utils/validators');

router.use(protect, requireRole('doctor'), requireVerifiedDoctor);

const patientBrief = (p, hasAccess) => ({
  id: p._id, uhrId: p.uhrId, name: p.user?.name, age: ageFromDob(p.dob), gender: p.gender, bloodGroup: p.bloodGroup, hasAccess,
});
const hasAccess = (doctor, patient) => patient.allowedDoctors.some((id) => id.equals(doctor._id));

/** Loads :patientId and enforces patient-granted access (normal, non-emergency path). */
const loadAuthorizedPatient = wrap(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId).populate('user', 'name email phone');
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!hasAccess(req.doctor, patient))
    return res.status(403).json({ code: 'NO_ACCESS', message: 'This patient has not granted you access to their record. In a genuine emergency, use Emergency Access.' });
  req.targetPatient = patient;
  next();
});

/* ----- overview ----- */
router.get('/overview', wrap(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const [assigned, todays, pending, recentActivity] = await Promise.all([
    Patient.countDocuments({ allowedDoctors: req.doctor._id }),
    Appointment.find({ doctor: req.doctor._id, scheduledAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } }).sort({ scheduledAt: 1 }).populate({ path: 'patient', populate: { path: 'user', select: 'name' } }),
    Appointment.countDocuments({ doctor: req.doctor._id, status: 'pending', scheduledAt: { $gte: new Date() } }),
    AuditLog.find({ actor: req.user._id, action: { $nin: ['LOGIN', 'LOGIN_FAILED'] } }).sort({ createdAt: -1 }).limit(8),
  ]);
  const prescriptionsWritten = await Prescription.countDocuments({ doctor: req.doctor._id });
  res.json({
    stats: { assignedPatients: assigned, todaysAppointments: todays.length, pendingRequests: pending, prescriptionsWritten },
    today: todays.map((a) => ({ ...a.toJSON(), patient: patientBrief(a.patient, true) })),
    recentActivity,
  });
}));

/* ----- patients: list + search ----- */
router.get('/patients', wrap(async (req, res) => {
  const list = await Patient.find({ allowedDoctors: req.doctor._id }).populate('user', 'name');
  res.json({ patients: list.map((p) => patientBrief(p, true)) });
}));

router.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ patients: [] });
  const upper = q.toUpperCase();
  // Exact UHR ID match, or UHR-ID prefix, or name match. Only minimal identifying data is returned.
  const byId = await Patient.find({ uhrId: new RegExp(`^${escapeRegex(upper)}`) }).populate('user', 'name').limit(10);
  const { User } = require('../models');
  const users = await User.find({ role: 'patient', name: new RegExp(escapeRegex(q), 'i') }).select('_id').limit(20);
  const byName = users.length ? await Patient.find({ user: { $in: users.map((u) => u._id) } }).populate('user', 'name').limit(10) : [];
  const seen = new Set();
  const patients = [...byId, ...byName].filter((p) => !seen.has(String(p._id)) && seen.add(String(p._id)));
  await audit({ req, action: 'PATIENT_SEARCH', details: `Query "${q.slice(0, 40)}" → ${patients.length} result(s)` });
  res.json({ patients: patients.map((p) => patientBrief(p, hasAccess(req.doctor, p))) });
}));

/* ----- full patient record (authorized) ----- */
router.get('/patients/:patientId', validObjectId('patientId'), loadAuthorizedPatient, wrap(async (req, res) => {
  const pid = req.targetPatient._id;
  const popDoc = { path: 'doctor', populate: { path: 'user', select: 'name' }, select: 'specialty user' };
  const [records, prescriptions, labs, contacts, appointments] = await Promise.all([
    MedicalRecord.find({ patient: pid }).sort({ date: -1 }).populate(popDoc),
    Prescription.find({ patient: pid }).sort({ prescribedAt: -1 }).populate(popDoc),
    LabReport.find({ patient: pid }).sort({ reportDate: -1 }),
    EmergencyContact.find({ patient: pid }).sort({ isPrimary: -1 }),
    Appointment.find({ patient: pid, doctor: req.doctor._id }).sort({ scheduledAt: -1 }).limit(10),
  ]);
  await audit({ req, action: 'VIEW_PATIENT_RECORD', patient: req.targetPatient, details: 'Viewed full medical history (patient-granted access)' });
  const withDoc = (x) => ({ ...x.toJSON(), doctor: x.doctor && { id: x.doctor._id, name: x.doctor.user?.name, specialty: x.doctor.specialty } });
  res.json({
    patient: { ...req.targetPatient.toJSON(), name: req.targetPatient.user.name, email: req.targetPatient.user.email, age: ageFromDob(req.targetPatient.dob) },
    records: records.map(withDoc), prescriptions: prescriptions.map(withDoc), labs, contacts, appointments,
  });
}));

/* ----- diagnoses / consultation notes ----- */
router.post('/patients/:patientId/records', validObjectId('patientId'), loadAuthorizedPatient, validate(v.recordSchema), wrap(async (req, res) => {
  const record = await MedicalRecord.create({ ...req.valid, patient: req.targetPatient._id, doctor: req.doctor._id });
  await Notification.create({ user: req.targetPatient.user._id, type: 'info', title: 'New entry in your record', message: `${req.user.name} added: ${record.title}` });
  await audit({ req, action: 'RECORD_CREATED', patient: req.targetPatient, details: `${record.type}: ${record.title}` });
  res.status(201).json({ record });
}));

router.put('/records/:id', validObjectId('id'), validate(v.recordSchema.partial()), wrap(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'Record not found' });
  const patient = await Patient.findById(record.patient);
  if (!hasAccess(req.doctor, patient)) return res.status(403).json({ message: 'You no longer have access to this patient' });
  if (!record.doctor?.equals(req.doctor._id)) return res.status(403).json({ message: 'Only the authoring doctor can update this entry' });
  Object.assign(record, req.valid);
  await record.save();
  await audit({ req, action: 'RECORD_UPDATED', patient, details: record.title });
  res.json({ record });
}));

/* ----- prescriptions ----- */
const requirePrescribe = (req, res, next) =>
  req.doctor.permissions?.prescribe ? next() : res.status(403).json({ message: 'Prescribing permission has been disabled for your account' });

router.post('/patients/:patientId/prescriptions', validObjectId('patientId'), loadAuthorizedPatient, requirePrescribe, validate(v.prescriptionSchema), wrap(async (req, res) => {
  const rx = await Prescription.create({ ...req.valid, patient: req.targetPatient._id, doctor: req.doctor._id });
  req.targetPatient.medications.push({ name: rx.medication, dose: rx.dosage, frequency: rx.frequency, prescriptionId: rx._id });
  await req.targetPatient.save();
  await Notification.create({ user: req.targetPatient.user._id, type: 'info', title: 'New prescription', message: `${rx.medication} ${rx.dosage} prescribed by ${req.user.name}` });
  await audit({ req, action: 'PRESCRIPTION_CREATED', patient: req.targetPatient, details: `${rx.medication} ${rx.dosage}` });
  res.status(201).json({ prescription: rx });
}));

router.put('/prescriptions/:id', validObjectId('id'), requirePrescribe, validate(v.prescriptionUpdateSchema), wrap(async (req, res) => {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) return res.status(404).json({ message: 'Prescription not found' });
  const patient = await Patient.findById(rx.patient);
  if (!hasAccess(req.doctor, patient)) return res.status(403).json({ message: 'You no longer have access to this patient' });
  if (!rx.doctor.equals(req.doctor._id)) return res.status(403).json({ message: 'Only the prescribing doctor can change this prescription' });
  Object.assign(rx, req.valid);
  await rx.save();
  // Keep the patient's "current medications" list in step with prescription status.
  patient.medications = patient.medications.filter((m) => !m.prescriptionId?.equals(rx._id));
  if (rx.status === 'active') patient.medications.push({ name: rx.medication, dose: rx.dosage, frequency: rx.frequency, prescriptionId: rx._id });
  await patient.save();
  await audit({ req, action: 'PRESCRIPTION_UPDATED', patient, details: `${rx.medication} → ${rx.status}` });
  res.json({ prescription: rx });
}));

router.get('/prescriptions', wrap(async (req, res) => {
  const list = await Prescription.find({ doctor: req.doctor._id }).sort({ prescribedAt: -1 }).limit(100)
    .populate({ path: 'patient', select: 'uhrId user', populate: { path: 'user', select: 'name' } });
  res.json({ prescriptions: list.map((r) => ({ ...r.toJSON(), patient: { id: r.patient._id, uhrId: r.patient.uhrId, name: r.patient.user?.name } })) });
}));

/* ----- report upload ----- */
router.post('/patients/:patientId/reports', validObjectId('patientId'), loadAuthorizedPatient, upload.single('file'), verifyMagicBytes, validate(v.reportMetaSchema), wrap(async (req, res) => {
  const report = await LabReport.create({
    ...req.valid, patient: req.targetPatient._id, uploadedBy: req.user._id, uploaderRole: 'doctor',
    file: req.file && { storedName: req.file.filename, originalName: req.file.originalname.slice(0, 120), mimeType: req.file.mimetype, size: req.file.size },
  });
  await audit({ req, action: 'REPORT_UPLOADED', patient: req.targetPatient, details: report.title });
  res.status(201).json({ report });
}));

/* ----- appointments ----- */
router.get('/appointments', wrap(async (req, res) => {
  const list = await Appointment.find({ doctor: req.doctor._id }).sort({ scheduledAt: -1 }).limit(100)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name' } });
  res.json({ appointments: list.map((a) => ({ ...a.toJSON(), patient: patientBrief(a.patient, hasAccess(req.doctor, a.patient)) })) });
}));

router.put('/appointments/:id', validObjectId('id'), validate(z.object({ status: z.enum(['confirmed', 'completed', 'cancelled']) })), wrap(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, doctor: req.doctor._id }).populate({ path: 'patient', select: 'user' });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  appt.status = req.valid.status;
  await appt.save();
  await Notification.create({ user: appt.patient.user, type: 'appointment', title: `Appointment ${appt.status}`, message: `Your appointment on ${appt.scheduledAt.toLocaleString()} is ${appt.status}.` });
  res.json({ appointment: appt });
}));

module.exports = router;
// exported for tests / reuse
module.exports.hasAccess = hasAccess;
void Doctor;
