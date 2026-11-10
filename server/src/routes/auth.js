const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User, Patient, Doctor } = require('../models');
const { protect, validate } = require('../middleware/auth');
const { wrap, generateUhrId, newQrToken, signToken, sessionUser, audit } = require('../utils/helpers');
const { registerSchema, loginSchema, passwordChangeSchema } = require('../utils/validators');
const { z } = require('zod');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const profileFor = (user) =>
  user.role === 'patient' ? Patient.findOne({ user: user._id }) : user.role === 'doctor' ? Doctor.findOne({ user: user._id }) : null;

router.post('/register', authLimiter, validate(registerSchema), wrap(async (req, res) => {
  const d = req.valid;
  if (await User.exists({ email: d.email }))
    return res.status(409).json({ message: 'An account with this email already exists', errors: { email: 'Already registered' } });

  const user = await User.create({ name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12), role: 'patient', phone: d.phone });
  const patient = await Patient.create({
    user: user._id, uhrId: await generateUhrId(), qrToken: newQrToken(),
    dob: d.dob, gender: d.gender, bloodGroup: d.bloodGroup, phone: d.phone,
  });
  await audit({ actor: user, req, action: 'REGISTER', patient, details: 'Patient account created' });
  res.status(201).json({ token: signToken(user), user: sessionUser(user, patient) });
}));

router.post('/login', authLimiter, validate(loginSchema), wrap(async (req, res) => {
  const { email, password } = req.valid;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await user.verifyPassword(password));
  if (!ok) {
    await audit({ req, actor: user || { name: email }, action: 'LOGIN_FAILED', details: `Failed sign-in for ${email}` });
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  if (user.status !== 'active') return res.status(403).json({ message: 'This account has been suspended. Contact an administrator.' });

  user.lastLoginAt = new Date();
  await user.save();
  await audit({ req, actor: user, action: 'LOGIN', details: 'Signed in' });
  res.json({ token: signToken(user), user: sessionUser(user, await profileFor(user)) });
}));

router.get('/me', protect, wrap(async (req, res) => {
  res.json({ user: sessionUser(req.user, req.patient || req.doctor) });
}));

router.put('/me', protect, validate(z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number').optional(),
})), wrap(async (req, res) => {
  req.user.name = req.valid.name;
  if (req.valid.phone) req.user.phone = req.valid.phone;
  await req.user.save();
  if (req.patient && req.valid.phone) await Patient.updateOne({ _id: req.patient._id }, { phone: req.valid.phone });
  res.json({ user: sessionUser(req.user, req.patient || req.doctor) });
}));

router.put('/password', protect, validate(passwordChangeSchema), wrap(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(req.valid.currentPassword)))
    return res.status(400).json({ message: 'Current password is incorrect', errors: { currentPassword: 'Incorrect password' } });
  user.passwordHash = await bcrypt.hash(req.valid.newPassword, 12);
  await user.save();
  await audit({ req, action: 'PASSWORD_CHANGED', details: 'Password updated' });
  res.json({ message: 'Password updated' });
}));

module.exports = router;
