const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;
const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...extra });
const clean = (_doc, ret) => {
  delete ret.__v;
  delete ret.passwordHash;
  return ret;
};
const opts = { timestamps: true, toJSON: { transform: clean } };

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* ---------- User ---------- */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    phone: { type: String, trim: true },
    lastLoginAt: Date,
  },
  opts
);
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/* ---------- Patient ---------- */
const allergySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'], default: 'moderate' },
  reaction: { type: String, trim: true, maxlength: 200 },
});
const conditionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  since: { type: String, trim: true, maxlength: 20 },
  notes: { type: String, trim: true, maxlength: 300 },
  critical: { type: Boolean, default: false },
});
const medicationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  dose: { type: String, trim: true, maxlength: 60 },
  frequency: { type: String, trim: true, maxlength: 60 },
  prescriptionId: ref('Prescription'),
});
const surgerySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  year: { type: String, trim: true, maxlength: 10 },
  notes: { type: String, trim: true, maxlength: 300 },
});
const vaccinationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: String, trim: true, maxlength: 20 },
});

const patientSchema = new Schema(
  {
    user: ref('User', { required: true, unique: true }),
    uhrId: { type: String, required: true, unique: true, index: true },
    qrToken: { type: String, required: true, unique: true, select: false },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    bloodGroup: { type: String, enum: [...BLOOD_GROUPS, 'Unknown'], default: 'Unknown' },
    phone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 250 },
    criticalNotes: { type: String, trim: true, maxlength: 600 },
    allergies: [allergySchema],
    conditions: [conditionSchema],
    medications: [medicationSchema],
    surgeries: [surgerySchema],
    vaccinations: [vaccinationSchema],
    allowedDoctors: [ref('Doctor')],
  },
  opts
);

/* ---------- Doctor ---------- */
const doctorSchema = new Schema(
  {
    user: ref('User', { required: true, unique: true }),
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    hospital: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: ref('User'),
    permissions: {
      prescribe: { type: Boolean, default: true },
      emergencyAccess: { type: Boolean, default: true },
    },
  },
  opts
);

/* ---------- Clinical records ---------- */
const medicalRecordSchema = new Schema(
  {
    patient: ref('Patient', { required: true, index: true }),
    doctor: ref('Doctor'),
    type: { type: String, enum: ['consultation', 'diagnosis', 'history', 'imaging'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    diagnosis: { type: String, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 4000 },
    treatment: { type: String, trim: true, maxlength: 2000 },
    critical: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  },
  opts
);

const prescriptionSchema = new Schema(
  {
    patient: ref('Patient', { required: true, index: true }),
    doctor: ref('Doctor', { required: true }),
    medication: { type: String, required: true, trim: true, maxlength: 100 },
    dosage: { type: String, required: true, trim: true, maxlength: 60 },
    frequency: { type: String, required: true, trim: true, maxlength: 80 },
    duration: { type: String, trim: true, maxlength: 60 },
    instructions: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'completed', 'discontinued'], default: 'active' },
    prescribedAt: { type: Date, default: Date.now },
  },
  opts
);

const labResultSchema = new Schema({
  test: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  unit: { type: String, trim: true },
  range: { type: String, trim: true },
  flag: { type: String, enum: ['normal', 'high', 'low', 'critical'], default: 'normal' },
});

const labReportSchema = new Schema(
  {
    patient: ref('Patient', { required: true, index: true }),
    uploadedBy: ref('User'),
    uploaderRole: { type: String, enum: ['patient', 'doctor', 'admin'] },
    category: { type: String, enum: ['laboratory', 'imaging', 'other'], default: 'laboratory' },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    summary: { type: String, trim: true, maxlength: 1500 },
    results: [labResultSchema],
    reportDate: { type: Date, default: Date.now },
    file: { storedName: String, originalName: String, mimeType: String, size: Number },
  },
  opts
);

const appointmentSchema = new Schema(
  {
    patient: ref('Patient', { required: true, index: true }),
    doctor: ref('Doctor', { required: true, index: true }),
    scheduledAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  },
  opts
);

const emergencyContactSchema = new Schema(
  {
    patient: ref('Patient', { required: true, index: true }),
    name: { type: String, required: true, trim: true, maxlength: 80 },
    relation: { type: String, required: true, trim: true, maxlength: 40 },
    phone: { type: String, required: true, trim: true, maxlength: 25 },
    email: { type: String, trim: true, lowercase: true },
    isPrimary: { type: Boolean, default: false },
  },
  opts
);

/* ---------- Emergency access + audit ---------- */
const emergencyAccessLogSchema = new Schema(
  {
    doctor: ref('Doctor', { required: true, index: true }),
    doctorName: String,
    patient: ref('Patient', { required: true, index: true }),
    patientName: String,
    uhrId: String,
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    method: { type: String, enum: ['qr', 'uhr-id'], required: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    endedAt: Date,
    accessedSections: [String],
    accessedRecords: [String],
    notified: [{ name: String, relation: String, channel: String, at: Date }],
    isDemo: { type: Boolean, default: true },
    review: {
      status: { type: String, enum: ['pending', 'justified', 'flagged'], default: 'pending' },
      note: String,
      reviewedBy: ref('User'),
      reviewedAt: Date,
    },
  },
  opts
);

const auditLogSchema = new Schema(
  {
    actor: ref('User'),
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true },
    patient: ref('Patient'),
    details: String,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { transform: clean } }
);

const notificationSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    type: { type: String, enum: ['info', 'emergency', 'appointment', 'access'], default: 'info' },
    title: { type: String, required: true },
    message: String,
    read: { type: Boolean, default: false },
  },
  opts
);

const m = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

module.exports = {
  BLOOD_GROUPS,
  User: m('User', userSchema),
  Patient: m('Patient', patientSchema),
  Doctor: m('Doctor', doctorSchema),
  MedicalRecord: m('MedicalRecord', medicalRecordSchema),
  Prescription: m('Prescription', prescriptionSchema),
  LabReport: m('LabReport', labReportSchema),
  Appointment: m('Appointment', appointmentSchema),
  EmergencyContact: m('EmergencyContact', emergencyContactSchema),
  EmergencyAccessLog: m('EmergencyAccessLog', emergencyAccessLogSchema),
  AuditLog: m('AuditLog', auditLogSchema),
  Notification: m('Notification', notificationSchema),
};
