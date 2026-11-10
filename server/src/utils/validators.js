const { z } = require('zod');
const { BLOOD_GROUPS } = require('../models');
const { isBookableSlot, SLOT_MESSAGE } = require('./slots');

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

const phone = z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number');
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));
const dateStr = z.coerce.date({ error: 'Enter a valid date' });
const bloodGroup = z.enum([...BLOOD_GROUPS, 'Unknown']);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password,
  phone,
  dob: dateStr.refine((d) => d < new Date(), 'Date of birth must be in the past'),
  gender: z.enum(['male', 'female', 'other'], { error: 'Select a gender' }),
  bloodGroup: bloodGroup.default('Unknown'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.optional(),
  address: optionalText(250),
  dob: dateStr.optional(),
  bloodGroup: bloodGroup.optional(),
  criticalNotes: optionalText(600),
});

const healthSchema = z.object({
  allergies: z.array(z.object({
    name: z.string().trim().min(1, 'Name required').max(80),
    severity: z.enum(['mild', 'moderate', 'severe', 'life-threatening']),
    reaction: optionalText(200),
  })).max(50).optional(),
  conditions: z.array(z.object({
    name: z.string().trim().min(1, 'Name required').max(100),
    since: optionalText(20),
    notes: optionalText(300),
    critical: z.boolean().optional(),
  })).max(50).optional(),
  medications: z.array(z.object({
    name: z.string().trim().min(1, 'Name required').max(100),
    dose: optionalText(60),
    frequency: optionalText(60),
    prescriptionId: z.string().optional().nullable(),
  })).max(50).optional(),
  surgeries: z.array(z.object({
    name: z.string().trim().min(1, 'Name required').max(120),
    year: optionalText(10),
    notes: optionalText(300),
  })).max(50).optional(),
  vaccinations: z.array(z.object({
    name: z.string().trim().min(1, 'Name required').max(100),
    date: optionalText(20),
  })).max(50).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(80),
  relation: z.string().trim().min(2, 'Enter the relationship').max(40),
  phone,
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
  isPrimary: z.boolean().optional(),
});

const appointmentSchema = z.object({
  doctorId: z.string().min(1, 'Choose a doctor'),
  scheduledAt: dateStr.refine((d) => d > new Date(), 'Choose a future date and time').refine(isBookableSlot, SLOT_MESSAGE),
  reason: z.string().trim().min(3, 'Describe the reason for your visit').max(300),
  // Sharing the record with the doctor is an explicit, optional choice (revocable under Privacy & access).
  shareRecord: z.boolean().default(false),
});
const rescheduleSchema = z.object({ scheduledAt: appointmentSchema.shape.scheduledAt });

const recordSchema = z.object({
  type: z.enum(['consultation', 'diagnosis', 'history', 'imaging']),
  title: z.string().trim().min(3, 'Enter a title').max(140),
  diagnosis: optionalText(200),
  notes: optionalText(4000),
  treatment: optionalText(2000),
  critical: z.boolean().optional(),
});

const prescriptionSchema = z.object({
  medication: z.string().trim().min(2, 'Enter the medication').max(100),
  dosage: z.string().trim().min(1, 'Enter the dosage').max(60),
  frequency: z.string().trim().min(1, 'Enter the frequency').max(80),
  duration: optionalText(60),
  instructions: optionalText(500),
});
const prescriptionUpdateSchema = prescriptionSchema.partial().extend({
  status: z.enum(['active', 'completed', 'discontinued']).optional(),
});

const reportMetaSchema = z.object({
  title: z.string().trim().min(3, 'Enter a title').max(140),
  category: z.enum(['laboratory', 'imaging', 'other']).default('laboratory'),
  summary: optionalText(1500),
  reportDate: dateStr.optional(),
});

const emergencyLookupSchema = z.object({
  uhrId: z.string().trim().toUpperCase().optional(),
  qrToken: z.string().trim().optional(),
}).refine((v) => v.uhrId || v.qrToken, { message: 'Provide a UHR ID or scan a QR code' });

const emergencyActivateSchema = z.object({
  patientId: z.string().min(1),
  method: z.enum(['qr', 'uhr-id']),
  reason: z.string().trim().min(15, 'Describe the emergency in at least 15 characters').max(500),
  password: z.string().min(1, 'Re-enter your password to verify your identity'),
  acknowledged: z.literal(true, { error: 'You must acknowledge the warning' }),
});

const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

const adminDoctorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password,
  licenseNumber: z.string().trim().min(4, 'Enter a license number').max(30),
  specialty: z.string().trim().min(2).max(60),
  hospital: optionalText(100),
});

module.exports = {
  registerSchema, loginSchema, profileSchema, healthSchema, contactSchema, appointmentSchema, rescheduleSchema,
  recordSchema, prescriptionSchema, prescriptionUpdateSchema, reportMetaSchema, emergencyLookupSchema,
  emergencyActivateSchema, passwordChangeSchema, adminDoctorSchema,
};
