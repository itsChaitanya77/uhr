const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const env = require('../config/env');
const { Patient, MedicalRecord, LabReport, EmergencyContact, EmergencyAccessLog, Notification } = require('../models');
const { protect, requireRole, requireVerifiedDoctor, validate, validObjectId } = require('../middleware/auth');
const { wrap, audit, ageFromDob, QR_PREFIX } = require('../utils/helpers');
const v = require('../utils/validators');

/**
 * Emergency Medical Access System (EMAS) - DEMONSTRATION.
 * Break-glass access: verified doctor -> identify patient (QR / UHR ID) -> re-authenticate,
 * give reason, acknowledge warning -> time-limited session -> every step audited.
 */
router.use(protect, requireRole('doctor'), requireVerifiedDoctor);

router.use(rateLimit({ windowMs: 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many emergency lookups. Slow down.' } }));

router.use((req, res, next) =>
  req.doctor.permissions?.emergencyAccess ? next() : res.status(403).json({ message: 'Emergency access has been disabled for your account by an administrator' }));

const isActive = (log) => !log.endedAt && log.expiresAt > new Date();

/* Step 1: identify the patient. Returns the bare minimum (name + UHR ID) so staff can confirm identity. */
router.post('/lookup', validate(v.emergencyLookupSchema), wrap(async (req, res) => {
  const { uhrId, qrToken } = req.valid;
  let patient = null;
  let method = 'uhr-id';
  if (qrToken) {
    method = 'qr';
    if (!qrToken.startsWith(QR_PREFIX)) return res.status(400).json({ message: 'This is not a UHR emergency QR code' });
    patient = await Patient.findOne({ qrToken: qrToken.slice(QR_PREFIX.length) }).populate('user', 'name');
  } else {
    patient = await Patient.findOne({ uhrId }).populate('user', 'name');
  }
  if (!patient) {
    await audit({ req, action: 'EMERGENCY_LOOKUP_FAILED', details: `No patient matched (${method})` });
    return res.status(404).json({ message: 'No patient found. Check the UHR ID or re-scan the QR code.' });
  }
  await audit({ req, action: 'EMERGENCY_LOOKUP', patient, details: `Identified via ${method}` });
  res.json({ patient: { id: patient._id, name: patient.user.name, uhrId: patient.uhrId, age: ageFromDob(patient.dob), gender: patient.gender }, method });
}));

/* Step 2: break-glass activation. */
router.post('/activate', validate(v.emergencyActivateSchema), wrap(async (req, res) => {
  const { patientId, method, reason, password } = req.valid;
  const { User } = require('../models');
  const doctorUser = await User.findById(req.user._id).select('+passwordHash');
  if (!(await doctorUser.verifyPassword(password))) {
    await audit({ req, action: 'EMERGENCY_REAUTH_FAILED', details: 'Wrong password at break-glass confirmation' });
    return res.status(401).json({ message: 'Identity check failed: incorrect password', errors: { password: 'Incorrect password' } });
  }
  const patient = await Patient.findById(patientId).populate('user', 'name');
  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  const expiresAt = new Date(Date.now() + env.emergencyWindowMinutes * 60 * 1000);
  const contacts = await EmergencyContact.find({ patient: patient._id }).sort({ isPrimary: -1 });
  const now = new Date();
  const log = await EmergencyAccessLog.create({
    doctor: req.doctor._id, doctorName: req.user.name, patient: patient._id, patientName: patient.user.name, uhrId: patient.uhrId,
    reason, method, expiresAt, isDemo: true,
    // Notifications are simulated in this prototype; each attempt is recorded so the flow is demonstrable.
    notified: contacts.map((c) => ({ name: c.name, relation: c.relation, channel: c.email ? 'SMS + email (simulated)' : 'SMS (simulated)', at: now })),
  });
  await Notification.create({
    user: patient.user._id, type: 'emergency', title: 'Emergency access to your record',
    message: `${req.user.name} accessed your emergency profile. Reason: ${reason}. Access expires at ${expiresAt.toLocaleTimeString()}.`,
  });
  await audit({ req, action: 'EMERGENCY_ACCESS_ACTIVATED', patient, details: `Reason: ${reason} | expires ${expiresAt.toISOString()}` });
  res.status(201).json({ sessionId: log._id, expiresAt, windowMinutes: env.emergencyWindowMinutes, notifiedCount: contacts.length });
}));

/* Step 3: the emergency dashboard data. Only while the session is active. */
router.get('/session/:id', validObjectId('id'), wrap(async (req, res) => {
  const log = await EmergencyAccessLog.findOne({ _id: req.params.id, doctor: req.doctor._id });
  if (!log) return res.status(404).json({ message: 'Emergency session not found' });
  if (!isActive(log)) return res.status(410).json({ code: 'SESSION_EXPIRED', message: 'This emergency access session has expired. Re-activate if still needed.', session: { expiresAt: log.expiresAt, endedAt: log.endedAt } });

  const patient = await Patient.findById(log.patient).populate('user', 'name');
  const [contacts, criticalRecords, labs] = await Promise.all([
    EmergencyContact.find({ patient: patient._id }).sort({ isPrimary: -1 }),
    MedicalRecord.find({ patient: patient._id }).sort({ critical: -1, date: -1 }).limit(6),
    LabReport.find({ patient: patient._id }).sort({ reportDate: -1 }).limit(6),
  ]);

  const sections = ['identity', 'blood group', 'allergies', 'conditions', 'medications', 'surgeries', 'critical history', 'recent reports', 'emergency contacts'];
  const recordTitles = [...criticalRecords.map((r) => `Record: ${r.title}`), ...labs.map((l) => `Report: ${l.title}`)];
  log.accessedSections = sections;
  log.accessedRecords = recordTitles;
  await log.save();
  await audit({ req, action: 'EMERGENCY_VIEW', patient, details: `Emergency dashboard viewed (${recordTitles.length} records)` });

  res.json({
    session: { id: log._id, reason: log.reason, startedAt: log.startedAt, expiresAt: log.expiresAt, notified: log.notified, serverNow: new Date() },
    patient: {
      id: patient._id, name: patient.user.name, uhrId: patient.uhrId, age: ageFromDob(patient.dob), gender: patient.gender,
      bloodGroup: patient.bloodGroup, criticalNotes: patient.criticalNotes,
      allergies: patient.allergies, conditions: patient.conditions, medications: patient.medications, surgeries: patient.surgeries,
    },
    criticalHistory: criticalRecords.map((r) => ({ id: r._id, title: r.title, type: r.type, diagnosis: r.diagnosis, notes: r.notes, critical: r.critical, date: r.date })),
    reports: labs,
    contacts,
  });
}));

router.post('/session/:id/end', validObjectId('id'), wrap(async (req, res) => {
  const log = await EmergencyAccessLog.findOne({ _id: req.params.id, doctor: req.doctor._id });
  if (!log) return res.status(404).json({ message: 'Emergency session not found' });
  if (!log.endedAt) { log.endedAt = new Date(); await log.save(); }
  await audit({ req, action: 'EMERGENCY_ACCESS_ENDED', patient: log.patient, details: 'Session ended by doctor' });
  res.json({ message: 'Emergency access ended' });
}));

router.get('/my-sessions', wrap(async (req, res) => {
  const logs = await EmergencyAccessLog.find({ doctor: req.doctor._id }).sort({ startedAt: -1 }).limit(20);
  res.json({ sessions: logs.map((l) => ({ ...l.toJSON(), active: isActive(l) })) });
}));

void z;
module.exports = router;
