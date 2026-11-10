const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { Doctor, LabReport, Patient, Notification, EmergencyAccessLog } = require('../models');
const { protect, validObjectId } = require('../middleware/auth');
const { wrap, audit } = require('../utils/helpers');
const { UPLOAD_DIR } = require('../middleware/upload');

router.use(protect);

/* Verified doctors (for booking + access control). Minimal public fields only. */
router.get('/doctors', wrap(async (req, res) => {
  const doctors = await Doctor.find({ verified: true }).populate('user', 'name');
  res.json({ doctors: doctors.map((d) => ({ id: d._id, name: d.user.name, specialty: d.specialty, hospital: d.hospital })) });
}));

/* Notifications */
router.get('/notifications', wrap(async (req, res) => {
  const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ notifications: list, unread: list.filter((n) => !n.read).length });
}));
router.put('/notifications/read-all', wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'ok' });
}));

/**
 * Authenticated file download for a report. Allowed for:
 *  - the owning patient
 *  - a verified doctor the patient has granted access to
 *  - a verified doctor with an ACTIVE emergency session for that patient
 */
router.get('/files/report/:id', validObjectId('id'), wrap(async (req, res) => {
  const report = await LabReport.findById(req.params.id);
  if (!report?.file?.storedName) return res.status(404).json({ message: 'No file attached to this report' });

  let allowed = false;
  let via = 'owner';
  if (req.user.role === 'patient') allowed = req.patient?._id.equals(report.patient);
  if (req.user.role === 'doctor' && req.doctor?.verified) {
    const patient = await Patient.findById(report.patient);
    if (patient?.allowedDoctors.some((id) => id.equals(req.doctor._id))) { allowed = true; via = 'granted'; }
    else if (await EmergencyAccessLog.exists({ doctor: req.doctor._id, patient: report.patient, endedAt: null, expiresAt: { $gt: new Date() } })) { allowed = true; via = 'emergency'; }
  }
  if (!allowed) return res.status(403).json({ message: 'You do not have access to this file' });

  const full = path.join(UPLOAD_DIR, path.basename(report.file.storedName));
  if (!fs.existsSync(full)) return res.status(404).json({ message: 'File is missing from storage' });
  await audit({ req, action: 'FILE_VIEWED', patient: report.patient, details: `${report.title} (${via})` });
  res.setHeader('Content-Type', report.file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(report.file.originalName || 'report')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(full);
}));

module.exports = router;
