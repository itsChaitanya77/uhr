const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const { User, Patient, Doctor } = require('../models');
const { wrap } = require('../utils/helpers');

/** Verifies the JWT, loads the user + role profile, and attaches them to req. */
const protect = wrap(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') return res.status(401).json({ message: 'Account unavailable' });

  req.user = user;
  if (user.role === 'patient') req.patient = await Patient.findOne({ user: user._id });
  if (user.role === 'doctor') req.doctor = await Doctor.findOne({ user: user._id });
  next();
});

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You do not have permission to do that' });

/** Doctor routes: the doctor's credentials must have been verified by an administrator. */
const requireVerifiedDoctor = (req, res, next) => {
  if (req.user?.role !== 'doctor' || !req.doctor) return res.status(403).json({ message: 'Doctor access only' });
  if (!req.doctor.verified)
    return res.status(403).json({ code: 'DOCTOR_NOT_VERIFIED', message: 'Your credentials are awaiting administrator verification' });
  next();
};

const validObjectId = (...params) => (req, res, next) => {
  for (const p of params) {
    if (!mongoose.isValidObjectId(req.params[p])) return res.status(400).json({ message: 'Invalid identifier' });
  }
  next();
};

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  }
  req.valid = result.data;
  next();
};

module.exports = { protect, requireRole, requireVerifiedDoctor, validObjectId, validate };
