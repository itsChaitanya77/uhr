const router = require('express').Router();
const fs = require('fs');
const { Patient, Doctor, MedicalRecord, Prescription, LabReport, Appointment, EmergencyContact, EmergencyAccessLog, AuditLog, Notification } = require('../models');
const { protect, requireRole, validate, validObjectId } = require('../middleware/auth');
const { upload, verifyMagicBytes } = require('../middleware/upload');
const { wrap, newQrToken, QR_PREFIX, audit } = require('../utils/helpers');
const v = require('../utils/validators');

router.use(protect, requireRole('patient'));

const populateDoctor = { path: 'doctor', populate: { path: 'user', select: 'name' }, select: 'specialty hospital user' };
const doctorLabel = (d) => (d ? { id: d._id, name: d.user?.name, specialty: d.specialty, hospital: d.hospital } : null);

/* ----- overview ----- */
router.get('/overview', wrap(async (req, res) => {
  const pid = req.patient._id;
  const [records, prescriptions, labs, upcoming, contacts, recentAccess] = await Promise.all([
    MedicalRecord.find({ patient: pid }).sort({ date: -1 }).limit(5).populate(populateDoctor),
    Prescription.find({ patient: pid }).sort({ prescribedAt: -1 }).limit(5).populate(populateDoctor),
    LabReport.find({ patient: pid }).sort({ reportDate: -1 }).limit(5),
    Appointment.find({ patient: pid, scheduledAt: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] } }).sort({ scheduledAt: 1 }).limit(5).populate(populateDoctor),
    EmergencyContact.countDocuments({ patient: pid }),
    EmergencyAccessLog.countDocuments({ patient: pid }),
  ]);
  const activity = [
    ...records.map((r) => ({ kind: 'record', id: r._id, title: r.title, subtitle: r.type, date: r.date })),
    ...prescriptions.map((p) => ({ kind: 'prescription', id: p._id, title: p.medication, subtitle: `${p.dosage} · ${p.frequency}`, date: p.prescribedAt })),
    ...labs.map((l) => ({ kind: 'lab', id: l._id, title: l.title, subtitle: l.category, date: l.reportDate })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const [recordCount, rxCount, labCount] = await Promise.all([
    MedicalRecord.countDocuments({ patient: pid }),
    Prescription.countDocuments({ patient: pid, status: 'active' }),
    LabReport.countDocuments({ patient: pid }),
  ]);
  res.json({
    patient: req.patient,
    user: { name: req.user.name, email: req.user.email },
    upcoming: upcoming.map((a) => ({ ...a.toJSON(), doctor: doctorLabel(a.doctor) })),
    activity,
    counts: { records: recordCount, activePrescriptions: rxCount, labReports: labCount, contacts, emergencyAccessEvents: recentAccess },
  });
}));

/* ----- profile + health profile ----- */
router.get('/profile', wrap(async (req, res) => res.json({ patient: req.patient, user: { name: req.user.name, email: req.user.email } })));

router.put('/profile', validate(v.profileSchema), wrap(async (req, res) => {
  const { name, ...rest } = req.valid;
  Object.assign(req.patient, rest);
  if (name) { req.user.name = name; await req.user.save(); }
  await req.patient.save();
  await audit({ req, action: 'PROFILE_UPDATED', patient: req.patient, details: 'Profile details updated' });
  res.json({ patient: req.patient });
}));

/**
 * Keeps medications linked to their active prescription so that discontinuing a prescription
 * also removes it from "current medications". Client-supplied links are only trusted if they point at
 * one of THIS patient's active prescriptions; a missing link is restored by matching the drug name.
 */
async function relinkMedications(patient, incoming) {
  const active = await Prescription.find({ patient: patient._id, status: 'active' }).select('_id');
  const activeIds = new Set(active.map((r) => String(r._id)));
  const byName = new Map(patient.medications.filter((m) => m.prescriptionId).map((m) => [m.name.toLowerCase(), String(m.prescriptionId)]));
  const used = new Set();
  const claim = (id) => (id && activeIds.has(id) && !used.has(id) && used.add(id) ? id : undefined);
  const linked = incoming.map((m) => ({ ...m, prescriptionId: claim(m.prescriptionId && String(m.prescriptionId)) }));
  return linked.map((m) => (m.prescriptionId ? m : { ...m, prescriptionId: claim(byName.get(m.name.toLowerCase())) }));
}

router.put('/health', validate(v.healthSchema), wrap(async (req, res) => {
  if (req.valid.medications) req.valid.medications = await relinkMedications(req.patient, req.valid.medications);
  Object.assign(req.patient, req.valid);
  await req.patient.save();
  await audit({ req, action: 'HEALTH_PROFILE_UPDATED', patient: req.patient, details: `Updated: ${Object.keys(req.valid).join(', ')}` });
  res.json({ patient: req.patient });
}));

/* ----- emergency profile ----- */
router.get('/emergency', wrap(async (req, res) => {
  const patient = await Patient.findById(req.patient._id).select('+qrToken');
  const contacts = await EmergencyContact.find({ patient: patient._id }).sort({ isPrimary: -1, createdAt: 1 });
  // The QR payload is an opaque token only. No medical data is ever encoded.
  res.json({ qrPayload: `${QR_PREFIX}${patient.qrToken}`, uhrId: patient.uhrId, bloodGroup: patient.bloodGroup, name: req.user.name, contacts });
}));

router.post('/emergency/rotate-qr', wrap(async (req, res) => {
  const patient = await Patient.findById(req.patient._id).select('+qrToken');
  patient.qrToken = newQrToken();
  await patient.save();
  await audit({ req, action: 'QR_ROTATED', patient, details: 'Emergency QR code regenerated; old code invalidated' });
  res.json({ qrPayload: `${QR_PREFIX}${patient.qrToken}` });
}));

router.post('/contacts', validate(v.contactSchema), wrap(async (req, res) => {
  const count = await EmergencyContact.countDocuments({ patient: req.patient._id });
  if (count >= 5) return res.status(400).json({ message: 'You can store up to 5 emergency contacts' });
  if (req.valid.isPrimary) await EmergencyContact.updateMany({ patient: req.patient._id }, { isPrimary: false });
  const contact = await EmergencyContact.create({ ...req.valid, isPrimary: req.valid.isPrimary || count === 0, patient: req.patient._id });
  await audit({ req, action: 'CONTACT_ADDED', patient: req.patient, details: contact.name });
  res.status(201).json({ contact });
}));

router.put('/contacts/:id', validObjectId('id'), validate(v.contactSchema), wrap(async (req, res) => {
  const contact = await EmergencyContact.findOne({ _id: req.params.id, patient: req.patient._id });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  if (req.valid.isPrimary) await EmergencyContact.updateMany({ patient: req.patient._id }, { isPrimary: false });
  Object.assign(contact, req.valid);
  await contact.save();
  res.json({ contact });
}));

router.delete('/contacts/:id', validObjectId('id'), wrap(async (req, res) => {
  const removed = await EmergencyContact.findOneAndDelete({ _id: req.params.id, patient: req.patient._id });
  if (!removed) return res.status(404).json({ message: 'Contact not found' });
  await audit({ req, action: 'CONTACT_REMOVED', patient: req.patient, details: removed.name });
  res.json({ message: 'Contact removed' });
}));

/* ----- records ----- */
router.get('/records', wrap(async (req, res) => {
  const pid = req.patient._id;
  const [records, prescriptions, labs] = await Promise.all([
    MedicalRecord.find({ patient: pid }).sort({ date: -1 }).populate(populateDoctor),
    Prescription.find({ patient: pid }).sort({ prescribedAt: -1 }).populate(populateDoctor),
    LabReport.find({ patient: pid }).sort({ reportDate: -1 }),
  ]);
  const dr = (x) => ({ ...x.toJSON(), doctor: doctorLabel(x.doctor) });
  res.json({ records: records.map(dr), prescriptions: prescriptions.map(dr), labs });
}));

router.post('/reports', upload.single('file'), verifyMagicBytes, validate(v.reportMetaSchema), wrap(async (req, res) => {
  const body = { ...req.valid };
  const report = await LabReport.create({
    ...body, patient: req.patient._id, uploadedBy: req.user._id, uploaderRole: 'patient',
    file: req.file && { storedName: req.file.filename, originalName: req.file.originalname.slice(0, 120), mimeType: req.file.mimetype, size: req.file.size },
  });
  await audit({ req, action: 'REPORT_UPLOADED', patient: req.patient, details: report.title });
  res.status(201).json({ report });
}));

router.delete('/reports/:id', validObjectId('id'), wrap(async (req, res) => {
  const report = await LabReport.findOne({ _id: req.params.id, patient: req.patient._id, uploaderRole: 'patient' });
  if (!report) return res.status(404).json({ message: 'Report not found, or it was added by your doctor and cannot be deleted' });
  if (report.file?.storedName) fs.unlink(`${__dirname}/../../uploads/${report.file.storedName}`, () => {});
  await report.deleteOne();
  await audit({ req, action: 'REPORT_DELETED', patient: req.patient, details: report.title });
  res.json({ message: 'Report deleted' });
}));

/* ----- appointments ----- */
router.get('/appointments', wrap(async (req, res) => {
  const list = await Appointment.find({ patient: req.patient._id }).sort({ scheduledAt: -1 }).populate(populateDoctor);
  res.json({ appointments: list.map((a) => ({ ...a.toJSON(), doctor: doctorLabel(a.doctor) })) });
}));

router.post('/appointments', validate(v.appointmentSchema), wrap(async (req, res) => {
  const { doctorId, scheduledAt, reason, shareRecord } = req.valid;
  const doctor = await Doctor.findOne({ _id: doctorId, verified: true }).populate('user', 'name');
  if (!doctor) return res.status(400).json({ message: 'Choose a verified doctor', errors: { doctorId: 'Doctor not available' } });
  if (await Appointment.exists({ doctor: doctor._id, scheduledAt, status: { $ne: 'cancelled' } }))
    return res.status(409).json({ message: 'That time slot is already booked', errors: { scheduledAt: 'Slot unavailable. Pick another time.' } });

  const appt = await Appointment.create({ patient: req.patient._id, doctor: doctor._id, scheduledAt, reason });
  // Access is granted only if the patient ticked the consent box (revocable under Privacy & Access).
  if (shareRecord && !req.patient.allowedDoctors.some((id) => id.equals(doctor._id))) {
    req.patient.allowedDoctors.push(doctor._id);
    await req.patient.save();
  }
  await Notification.create({ user: doctor.user._id, type: 'appointment', title: 'New appointment request', message: `${req.user.name} requested ${scheduledAt.toLocaleString()}` });
  await audit({ req, action: 'APPOINTMENT_BOOKED', patient: req.patient, details: `With ${doctor.user.name}${shareRecord ? ' (record shared)' : ''}` });
  res.status(201).json({ appointment: appt });
}));

router.put('/appointments/:id', validObjectId('id'), validate(v.rescheduleSchema), wrap(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.patient._id });
  if (!appt || ['completed', 'cancelled'].includes(appt.status)) return res.status(404).json({ message: 'Appointment cannot be changed' });
  if (await Appointment.exists({ _id: { $ne: appt._id }, doctor: appt.doctor, scheduledAt: req.valid.scheduledAt, status: { $ne: 'cancelled' } }))
    return res.status(409).json({ message: 'That time slot is already booked', errors: { scheduledAt: 'Slot unavailable. Pick another time.' } });
  appt.scheduledAt = req.valid.scheduledAt;
  appt.status = 'pending';
  await appt.save();
  await audit({ req, action: 'APPOINTMENT_RESCHEDULED', patient: req.patient });
  res.json({ appointment: appt });
}));

router.delete('/appointments/:id', validObjectId('id'), wrap(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.patient._id });
  if (!appt || ['completed', 'cancelled'].includes(appt.status)) return res.status(404).json({ message: 'Appointment cannot be cancelled' });
  appt.status = 'cancelled';
  await appt.save();
  await audit({ req, action: 'APPOINTMENT_CANCELLED', patient: req.patient });
  res.json({ message: 'Appointment cancelled' });
}));

/* ----- privacy & access control ----- */
router.get('/access', wrap(async (req, res) => {
  const doctors = await Doctor.find({ verified: true }).populate('user', 'name');
  const granted = new Set(req.patient.allowedDoctors.map(String));
  const emergencyLogs = await EmergencyAccessLog.find({ patient: req.patient._id }).sort({ startedAt: -1 }).limit(20);
  const activity = await AuditLog.find({ patient: req.patient._id, action: { $in: ['VIEW_PATIENT_RECORD', 'EMERGENCY_ACCESS_ACTIVATED', 'EMERGENCY_VIEW', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'FILE_VIEWED'] } }).sort({ createdAt: -1 }).limit(20);
  res.json({
    doctors: doctors.map((d) => ({ id: d._id, name: d.user.name, specialty: d.specialty, hospital: d.hospital, granted: granted.has(String(d._id)) })),
    emergencyLogs,
    activity,
  });
}));

router.put('/access/:doctorId', validObjectId('doctorId'), validate(require('zod').z.object({ granted: require('zod').z.boolean() })), wrap(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, verified: true }).populate('user', 'name');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const has = req.patient.allowedDoctors.some((id) => id.equals(doctor._id));
  if (req.valid.granted && !has) req.patient.allowedDoctors.push(doctor._id);
  if (!req.valid.granted && has) req.patient.allowedDoctors = req.patient.allowedDoctors.filter((id) => !id.equals(doctor._id));
  await req.patient.save();
  await audit({ req, action: req.valid.granted ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED', patient: req.patient, details: doctor.user.name });
  res.json({ granted: req.valid.granted });
}));

module.exports = router;
