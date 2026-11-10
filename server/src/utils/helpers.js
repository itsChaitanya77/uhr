const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Patient, AuditLog } = require('../models');

const QR_PREFIX = 'UHR-EMG:';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const newQrToken = () => crypto.randomBytes(24).toString('hex');

async function generateUhrId() {
  for (let i = 0; i < 10; i += 1) {
    const id = `UHR-${crypto.randomInt(1000000, 9999999)}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await Patient.exists({ uhrId: id }))) return id;
  }
  throw new Error('Could not allocate a unique UHR ID');
}

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

function sessionUser(user, profile) {
  const base = { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
  if (user.role === 'patient' && profile) return { ...base, patientId: profile._id, uhrId: profile.uhrId };
  if (user.role === 'doctor' && profile)
    return { ...base, doctorId: profile._id, verified: profile.verified, specialty: profile.specialty, hospital: profile.hospital, permissions: profile.permissions };
  return base;
}

/** Write an audit entry. Never throws: auditing must not break the request. */
async function audit({ req, actor, action, patient, details }) {
  try {
    const user = actor || req?.user;
    await AuditLog.create({
      actor: user?._id,
      actorName: user?.name,
      actorRole: user?.role,
      action,
      patient: patient?._id || patient,
      details,
      ip: req?.ip,
    });
  } catch (err) {
    console.error('Audit log failure:', err.message);
  }
}

const ageFromDob = (dob) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));

module.exports = { QR_PREFIX, wrap, escapeRegex, newQrToken, generateUhrId, signToken, sessionUser, audit, ageFromDob };
