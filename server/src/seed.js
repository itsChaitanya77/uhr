/**
 * Demo data seeder. ALL DATA IS SYNTHETIC. No real patients, doctors or credentials.
 * Run:  npm run seed   (this wipes the UHR collections first)
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./config/env');
const M = require('./models');
const { newQrToken } = require('./utils/helpers');

const DAY = 24 * 3600 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const at = (offsetDays, hour, minute = 0) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const PASSWORDS = { admin: 'Admin@123', doctor: 'Doctor@123', patient: 'Patient@123' };

async function seed() {
  await Promise.all(Object.values(M).filter((x) => x.deleteMany).map((model) => model.deleteMany({})));
  const hash = (pw) => bcrypt.hash(pw, 10);

  /* ---- admin ---- */
  const adminUser = await M.User.create({ name: 'Ananya Rao (Admin)', email: 'admin@uhr.demo', passwordHash: await hash(PASSWORDS.admin), role: 'admin' });

  /* ---- doctors ---- */
  const doctorDefs = [
    { name: 'Dr. Vikram Sharma', email: 'dr.sharma@uhr.demo', license: 'MCI-DEMO-10021', specialty: 'Emergency Medicine', hospital: 'Lakeview General Hospital (demo)', verified: true },
    { name: 'Dr. Neha Patel', email: 'dr.patel@uhr.demo', license: 'MCI-DEMO-10347', specialty: 'Cardiology', hospital: 'Lakeview General Hospital (demo)', verified: true },
    { name: 'Dr. Arjun Nair', email: 'dr.nair@uhr.demo', license: 'MCI-DEMO-10588', specialty: 'Endocrinology', hospital: 'Riverside Clinic (demo)', verified: false },
  ];
  const doctors = [];
  for (const d of doctorDefs) {
    const user = await M.User.create({ name: d.name, email: d.email, passwordHash: await hash(PASSWORDS.doctor), role: 'doctor', phone: '+91 90000 0000' + doctors.length });
    const doctor = await M.Doctor.create({ user: user._id, licenseNumber: d.license, specialty: d.specialty, hospital: d.hospital, verified: d.verified, verifiedAt: d.verified ? daysAgo(60) : undefined, verifiedBy: d.verified ? adminUser._id : undefined });
    doctors.push({ user, doctor });
  }
  const [sharma, patel] = doctors;

  /* ---- patients ---- */
  const patientDefs = [
    {
      name: 'Aarav Mehta', email: 'aarav@uhr.demo', uhr: 'UHR-1000001', dob: '1978-04-12', gender: 'male', blood: 'O+', phone: '+91 98100 11001',
      address: '14 Lake Road, Pune', critical: 'Type 2 diabetic on insulin: risk of hypoglycaemia. Hypertensive.',
      allergies: [{ name: 'Penicillin', severity: 'life-threatening', reaction: 'Anaphylaxis' }, { name: 'Sulfonamides', severity: 'moderate', reaction: 'Skin rash' }],
      conditions: [{ name: 'Type 2 Diabetes Mellitus', since: '2014', critical: true, notes: 'On basal-bolus insulin' }, { name: 'Hypertension', since: '2016', critical: false }],
      medications: [{ name: 'Insulin glargine', dose: '24 units', frequency: 'Nightly' }, { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily' }, { name: 'Amlodipine', dose: '5 mg', frequency: 'Once daily' }],
      surgeries: [{ name: 'Appendectomy', year: '2003' }],
      vaccinations: [{ name: 'COVID-19 (booster)', date: '2023-02' }, { name: 'Influenza', date: '2025-10' }, { name: 'Hepatitis B', date: '2009' }],
      contacts: [{ name: 'Sunita Mehta', relation: 'Spouse', phone: '+91 98100 11002', email: 'sunita.demo@example.com', isPrimary: true }, { name: 'Rahul Mehta', relation: 'Brother', phone: '+91 98100 11003' }],
    },
    {
      name: 'Priya Iyer', email: 'priya@uhr.demo', uhr: 'UHR-1000002', dob: '1991-09-30', gender: 'female', blood: 'A-', phone: '+91 98200 22001',
      address: '8 Temple Street, Chennai', critical: 'Severe asthma with prior ICU admission. Carry reliever inhaler.',
      allergies: [{ name: 'Aspirin / NSAIDs', severity: 'severe', reaction: 'Bronchospasm' }, { name: 'Dust mites', severity: 'mild', reaction: 'Rhinitis' }],
      conditions: [{ name: 'Severe persistent asthma', since: '2002', critical: true, notes: 'Previous ICU admission 2019' }],
      medications: [{ name: 'Budesonide/Formoterol inhaler', dose: '160/4.5 mcg', frequency: 'Twice daily' }, { name: 'Salbutamol inhaler', dose: '100 mcg', frequency: 'As needed' }],
      surgeries: [{ name: 'Tonsillectomy', year: '2008' }],
      vaccinations: [{ name: 'Influenza', date: '2025-09' }, { name: 'Pneumococcal', date: '2022-05' }],
      contacts: [{ name: 'Lakshmi Iyer', relation: 'Mother', phone: '+91 98200 22002', isPrimary: true }],
    },
    {
      name: 'Rohan Das', email: 'rohan@uhr.demo', uhr: 'UHR-1000003', dob: '2001-01-22', gender: 'male', blood: 'B+', phone: '+91 98300 33001',
      address: '22 Park Avenue, Kolkata', critical: 'Epilepsy: may present with post-ictal confusion. Severe peanut and latex allergy (carries adrenaline auto-injector).',
      allergies: [{ name: 'Peanuts', severity: 'life-threatening', reaction: 'Anaphylaxis' }, { name: 'Latex', severity: 'severe', reaction: 'Urticaria, wheeze' }],
      conditions: [{ name: 'Epilepsy (generalised tonic-clonic)', since: '2012', critical: true, notes: 'Last seizure 8 months ago' }],
      medications: [{ name: 'Levetiracetam', dose: '750 mg', frequency: 'Twice daily' }, { name: 'Adrenaline auto-injector', dose: '0.3 mg', frequency: 'Emergency use' }],
      surgeries: [],
      vaccinations: [{ name: 'COVID-19', date: '2022-01' }, { name: 'Tetanus booster', date: '2021-07' }],
      contacts: [{ name: 'Debashis Das', relation: 'Father', phone: '+91 98300 33002', isPrimary: true }, { name: 'Ishita Das', relation: 'Sister', phone: '+91 98300 33003' }],
    },
    {
      name: 'Meera Kapoor', email: 'meera@uhr.demo', uhr: 'UHR-1000004', dob: '1985-06-05', gender: 'female', blood: 'AB+', phone: '+91 98400 44001',
      address: '5 Garden Colony, Delhi', critical: 'Hypothyroidism. Currently 24 weeks pregnant (demo data).',
      allergies: [{ name: 'Iodinated contrast', severity: 'moderate', reaction: 'Hives' }],
      conditions: [{ name: 'Hypothyroidism', since: '2018', critical: false }, { name: 'Gestational hypertension (monitoring)', since: '2026', critical: true }],
      medications: [{ name: 'Levothyroxine', dose: '75 mcg', frequency: 'Once daily' }, { name: 'Folic acid', dose: '5 mg', frequency: 'Once daily' }],
      surgeries: [{ name: 'Caesarean section', year: '2019' }],
      vaccinations: [{ name: 'Tdap (pregnancy)', date: '2026-08' }, { name: 'Influenza', date: '2025-10' }],
      contacts: [{ name: 'Anil Kapoor', relation: 'Spouse', phone: '+91 98400 44002', email: 'anil.demo@example.com', isPrimary: true }],
    },
    {
      name: 'Karthik Reddy', email: 'karthik@uhr.demo', uhr: 'UHR-1000005', dob: '1962-11-18', gender: 'male', blood: 'O-', phone: '+91 98500 55001',
      address: '31 Hill View, Hyderabad', critical: 'ON WARFARIN (anticoagulated): bleeding risk. Coronary stent in situ.',
      allergies: [{ name: 'Iodine / shellfish', severity: 'severe', reaction: 'Facial swelling' }, { name: 'Codeine', severity: 'moderate', reaction: 'Nausea, hypotension' }],
      conditions: [{ name: 'Coronary artery disease', since: '2019', critical: true, notes: 'Drug-eluting stent to LAD (2019)' }, { name: 'Atrial fibrillation', since: '2021', critical: true, notes: 'Anticoagulated' }, { name: 'Chronic kidney disease stage 3', since: '2022', critical: false }],
      medications: [{ name: 'Warfarin', dose: '3 mg', frequency: 'Evening' }, { name: 'Atorvastatin', dose: '40 mg', frequency: 'Nightly' }, { name: 'Metoprolol', dose: '50 mg', frequency: 'Twice daily' }],
      surgeries: [{ name: 'Percutaneous coronary intervention (stent)', year: '2019' }, { name: 'Cataract surgery (L)', year: '2024' }],
      vaccinations: [{ name: 'Influenza', date: '2025-10' }, { name: 'Pneumococcal', date: '2023-03' }, { name: 'Shingles', date: '2024-01' }],
      contacts: [{ name: 'Lavanya Reddy', relation: 'Daughter', phone: '+91 98500 55002', email: 'lavanya.demo@example.com', isPrimary: true }, { name: 'Suresh Reddy', relation: 'Son', phone: '+91 98500 55003' }],
    },
  ];

  const patients = [];
  for (const p of patientDefs) {
    const user = await M.User.create({ name: p.name, email: p.email, passwordHash: await hash(PASSWORDS.patient), role: 'patient', phone: p.phone });
    const patient = await M.Patient.create({
      user: user._id, uhrId: p.uhr, qrToken: newQrToken(), dob: p.dob, gender: p.gender, bloodGroup: p.blood, phone: p.phone, address: p.address,
      criticalNotes: p.critical, allergies: p.allergies, conditions: p.conditions, medications: p.medications, surgeries: p.surgeries, vaccinations: p.vaccinations,
    });
    await M.EmergencyContact.insertMany(p.contacts.map((c) => ({ ...c, patient: patient._id })));
    patients.push({ user, patient });
  }
  const [aarav, priya, rohan, meera, karthik] = patients;

  // Access grants: Dr. Patel (cardiology) sees Aarav & Karthik; Dr. Sharma sees Priya. Rohan & Meera have granted nobody (emergency-only demo).
  const grant = async (pt, doc) => { pt.patient.allowedDoctors.push(doc.doctor._id); await pt.patient.save(); };
  await grant(aarav, patel); await grant(karthik, patel); await grant(priya, sharma); await grant(aarav, sharma);

  /* ---- 10 medical records ---- */
  const rec = (pt, doc, type, title, d, extra) => ({ patient: pt.patient._id, doctor: doc.doctor._id, type, title, date: daysAgo(d), ...extra });
  const records = await M.MedicalRecord.insertMany([
    rec(aarav, patel, 'consultation', 'Cardiology review: hypertension control', 21, { diagnosis: 'Essential hypertension', notes: 'BP 148/92 on arrival. Reviewed home readings; adherent to amlodipine. Advised salt restriction and 30 min walking daily.', treatment: 'Continue amlodipine 5 mg; review in 6 weeks.' }),
    rec(aarav, sharma, 'diagnosis', 'Diabetic retinopathy screening: mild NPDR', 75, { diagnosis: 'Mild non-proliferative diabetic retinopathy', notes: 'Annual screening. No macular oedema.', treatment: 'Repeat screening in 12 months.', critical: false }),
    rec(aarav, patel, 'history', 'Hypoglycaemic episode: ED visit', 140, { diagnosis: 'Hypoglycaemia (insulin-related)', notes: 'Glucose 2.4 mmol/L on arrival, responded to IV dextrose. Insulin dose adjusted.', critical: true }),
    rec(priya, sharma, 'consultation', 'Asthma review: step-up therapy', 30, { diagnosis: 'Severe persistent asthma', notes: 'Two night-time exacerbations this month. Peak flow 62% predicted. Technique reviewed.', treatment: 'Stepped up to budesonide/formoterol maintenance + reliever therapy.' }),
    rec(priya, sharma, 'history', 'ICU admission: life-threatening asthma attack', 900, { diagnosis: 'Status asthmaticus', notes: 'Intubated for 36 hours. Triggered by NSAID exposure. NSAIDs contraindicated.', critical: true }),
    rec(rohan, sharma, 'consultation', 'Neurology follow-up: seizure control', 60, { diagnosis: 'Generalised epilepsy', notes: 'Seizure-free 8 months on levetiracetam. Advised sleep regularity; no driving restrictions lifted yet.', treatment: 'Continue levetiracetam 750 mg BD.', critical: true }),
    rec(meera, patel, 'consultation', 'Antenatal visit: 24 weeks', 14, { diagnosis: 'Gestational hypertension (monitoring)', notes: 'BP 138/88. No proteinuria. Fetal growth appropriate.', treatment: 'Home BP monitoring; review in 2 weeks.' }),
    rec(karthik, patel, 'consultation', 'Cardiology: anticoagulation review', 10, { diagnosis: 'Atrial fibrillation on warfarin', notes: 'INR 2.6 (target 2–3). No bleeding. Rate controlled on metoprolol.', treatment: 'Continue warfarin 3 mg. INR check in 4 weeks.', critical: true }),
    rec(karthik, patel, 'imaging', 'Echocardiogram', 45, { diagnosis: 'LVEF 52%', notes: 'Mild LA dilatation. No significant valvular disease. Stent territory wall motion normal.' }),
    rec(karthik, patel, 'history', 'PCI with drug-eluting stent (LAD)', 2300, { diagnosis: 'Acute coronary syndrome', notes: 'Single DES to proximal LAD. Uncomplicated recovery.', critical: true }),
  ]);
  void records;

  /* ---- 5 prescriptions ---- */
  const rxDefs = [
    [aarav, patel, 'Amlodipine', '5 mg', 'Once daily', '90 days', 'Take in the morning', 'active', 21],
    [priya, sharma, 'Budesonide/Formoterol inhaler', '160/4.5 mcg', 'Twice daily + as needed', 'Ongoing', 'Rinse mouth after use', 'active', 30],
    [rohan, sharma, 'Levetiracetam', '750 mg', 'Twice daily', '6 months', 'Do not stop abruptly', 'active', 60],
    [meera, patel, 'Labetalol', '100 mg', 'Twice daily', '4 weeks', 'Hold if BP below 100/60', 'active', 14],
    [karthik, patel, 'Warfarin', '3 mg', 'Evening', '3 months', 'Regular INR checks. Avoid NSAIDs.', 'active', 10],
  ];
  for (const [pt, doc, medication, dosage, frequency, duration, instructions, status, d] of rxDefs) {
    await M.Prescription.create({ patient: pt.patient._id, doctor: doc.doctor._id, medication, dosage, frequency, duration, instructions, status, prescribedAt: daysAgo(d) });
  }
  // Labetalol is a new prescription for Meera that isn't yet in her medication list.
  const labetalol = await M.Prescription.findOne({ medication: 'Labetalol' });
  meera.patient.medications.push({ name: 'Labetalol', dose: '100 mg', frequency: 'Twice daily', prescriptionId: labetalol._id });
  await meera.patient.save();

  /* ---- 5 lab reports ---- */
  const labDefs = [
    [aarav, 'HbA1c & lipid panel', 'laboratory', 25, 'HbA1c above target; LDL borderline.', [
      { test: 'HbA1c', value: '8.1', unit: '%', range: '< 7.0', flag: 'high' }, { test: 'LDL cholesterol', value: '131', unit: 'mg/dL', range: '< 100', flag: 'high' }, { test: 'Fasting glucose', value: '142', unit: 'mg/dL', range: '70–100', flag: 'high' }]],
    [priya, 'Spirometry', 'laboratory', 35, 'Obstructive pattern with partial bronchodilator reversibility.', [
      { test: 'FEV1', value: '62', unit: '% predicted', range: '> 80', flag: 'low' }, { test: 'FEV1/FVC', value: '0.64', unit: '', range: '> 0.70', flag: 'low' }]],
    [rohan, 'EEG report', 'other', 90, 'Generalised spike-and-wave activity; no focal abnormality.', []],
    [meera, 'Thyroid function + CBC', 'laboratory', 16, 'TSH within target range for pregnancy.', [
      { test: 'TSH', value: '2.1', unit: 'mIU/L', range: '0.3–3.0', flag: 'normal' }, { test: 'Haemoglobin', value: '10.8', unit: 'g/dL', range: '11–14', flag: 'low' }]],
    [karthik, 'INR & renal function', 'laboratory', 10, 'INR therapeutic. eGFR reduced (CKD 3).', [
      { test: 'INR', value: '2.6', unit: '', range: '2.0–3.0', flag: 'normal' }, { test: 'Creatinine', value: '1.7', unit: 'mg/dL', range: '0.7–1.3', flag: 'high' }, { test: 'eGFR', value: '44', unit: 'mL/min', range: '> 60', flag: 'low' }, { test: 'Potassium', value: '5.4', unit: 'mmol/L', range: '3.5–5.0', flag: 'high' }]],
  ];
  for (const [pt, title, category, d, summary, results] of labDefs) {
    await M.LabReport.create({ patient: pt.patient._id, uploadedBy: pt.user._id, uploaderRole: 'patient', title, category, summary, results, reportDate: daysAgo(d) });
  }

  /* ---- 5 appointments ---- */
  await M.Appointment.insertMany([
    { patient: aarav.patient._id, doctor: patel.doctor._id, scheduledAt: at(0, 16, 0), reason: 'Blood pressure follow-up', status: 'confirmed' },
    { patient: karthik.patient._id, doctor: patel.doctor._id, scheduledAt: at(0, 16, 30), reason: 'INR review and anticoagulation check', status: 'confirmed' },
    { patient: priya.patient._id, doctor: sharma.doctor._id, scheduledAt: at(4, 10, 30), reason: 'Asthma action plan review', status: 'pending' },
    { patient: meera.patient._id, doctor: patel.doctor._id, scheduledAt: at(9, 11, 0), reason: 'Antenatal blood pressure check', status: 'confirmed' },
    { patient: aarav.patient._id, doctor: sharma.doctor._id, scheduledAt: daysAgo(30), reason: 'Annual diabetic eye screening referral', status: 'completed' },
  ]);

  /* ---- sample emergency access history (clearly demo) so the admin dashboard has data ---- */
  const emerg = [
    [sharma, rohan, 'Patient brought in unresponsive after suspected seizure, needs allergy and medication history before treatment.', 'qr', 9, 'justified', 'Verified against ED triage record.'],
    [sharma, karthik, 'Collapsed in the street, unconscious, no ID. Needs anticoagulation status before intervention.', 'uhr-id', 5, 'justified', 'Appropriate use. Patient later confirmed.'],
    [patel, meera, 'Pregnant patient in respiratory distress, unable to communicate; need allergy/contrast history.', 'qr', 2, 'pending', undefined],
    [sharma, priya, 'Severe breathing difficulty, patient unable to speak. Need to confirm NSAID contraindication.', 'qr', 1, 'pending', undefined],
  ];
  for (const [doc, pt, reason, method, d, status, note] of emerg) {
    const started = daysAgo(d);
    await M.EmergencyAccessLog.create({
      doctor: doc.doctor._id, doctorName: doc.user.name, patient: pt.patient._id, patientName: pt.user.name, uhrId: pt.patient.uhrId, reason, method,
      startedAt: started, expiresAt: new Date(started.getTime() + 30 * 60000), endedAt: new Date(started.getTime() + 18 * 60000),
      accessedSections: ['identity', 'allergies', 'conditions', 'medications'], isDemo: true,
      notified: [{ name: 'Primary contact', relation: 'Emergency contact', channel: 'SMS (simulated)', at: started }],
      review: { status, note, reviewedBy: status === 'pending' ? undefined : adminUser._id, reviewedAt: status === 'pending' ? undefined : daysAgo(d - 0.5) },
    });
    await M.AuditLog.create({ actor: doc.user._id, actorName: doc.user.name, actorRole: 'doctor', action: 'EMERGENCY_ACCESS_ACTIVATED', patient: pt.patient._id, details: `Reason: ${reason}`, createdAt: started });
  }
  // Background activity across the last two weeks for the activity chart.
  const actions = [['LOGIN', 'Signed in'], ['VIEW_PATIENT_RECORD', 'Viewed full medical history (patient-granted access)'], ['PATIENT_SEARCH', 'Patient search'], ['REPORT_UPLOADED', 'Report uploaded'], ['PRESCRIPTION_CREATED', 'Prescription created']];
  const actors = [patel, sharma, aarav, priya, karthik];
  const bulk = [];
  for (let d = 13; d >= 0; d -= 1) {
    const n = 3 + ((d * 7) % 6);
    for (let i = 0; i < n; i += 1) {
      const [action, details] = actions[(d + i) % actions.length];
      const actor = actors[(d * 3 + i) % actors.length];
      bulk.push({ actor: actor.user._id, actorName: actor.user.name, actorRole: actor.user.role, action, details, ip: '::1', createdAt: new Date(Date.now() - d * DAY - i * 3600 * 1000) });
    }
  }
  await M.AuditLog.insertMany(bulk);
  await M.Notification.create({ user: rohan.user._id, type: 'emergency', title: 'Emergency access to your record', message: 'Dr. Vikram Sharma accessed your emergency profile (demo history).', createdAt: daysAgo(9) });

  console.log('Seed complete: 1 admin, 3 doctors, 5 patients, 10 records, 5 prescriptions, 5 lab reports, 5 appointments.');
}

module.exports = { seed, PASSWORDS };

if (require.main === module) {
  mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 })
    .then(seed)
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.warn(`\n⚠️  Could not connect to MongoDB at ${env.mongoUri}: ${err.message}`);
      console.log('💡 Note: When starting the server with "npm start" or "node src/server.js", UHR automatically starts an embedded database and seeds it with demo data!\n');
      process.exit(1);
    });
}
