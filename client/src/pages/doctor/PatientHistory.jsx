import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardPlus, Droplets, Lock, Pencil, Pill, UploadCloud } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, PageSkeleton, Select, Textarea } from '../../components/ui';
import RecordTabs from '../../components/records/RecordViews';
import UploadReportModal from '../../components/records/UploadReportModal';
import { SEVERITY_STYLE } from '../../utils/format';

function RecordModal({ patientId, record, onClose, onDone }) {
  const toast = useToast();
  const { run, saving, fieldErrors } = useAction(toast);
  const [f, setF] = useState({ type: record?.type || 'consultation', title: record?.title || '', diagnosis: record?.diagnosis || '', notes: record?.notes || '', treatment: record?.treatment || '', critical: record?.critical || false });
  const [errs, setErrs] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    if (f.title.trim().length < 3) return setErrs({ title: 'Enter a title (at least 3 characters)' });
    setErrs({});
    const ok = await run(() => (record ? api.put(`/doctor/records/${record._id}`, f) : api.post(`/doctor/patients/${patientId}/records`, f)), record ? 'Entry updated' : 'Entry added to record');
    if (ok) { onDone(); onClose(); }
  };
  const err = (k) => errs[k] || fieldErrors[k];
  return (
    <Modal open onClose={onClose} title={record ? 'Update clinical entry' : 'Add diagnosis / consultation note'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>{record ? 'Save changes' : 'Add to record'}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-3">
        <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="consultation">Consultation</option><option value="diagnosis">Diagnosis</option><option value="history">Medical history</option><option value="imaging">Imaging</option></Select>
        <Input className="sm:col-span-2" label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err('title')} placeholder="e.g. Follow-up: hypertension" />
        <Input className="sm:col-span-3" label="Diagnosis" value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} error={err('diagnosis')} />
        <Textarea className="sm:col-span-3" rows={4} label="Consultation notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} error={err('notes')} />
        <Textarea className="sm:col-span-3" label="Treatment plan" value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value })} error={err('treatment')} />
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-red-600" checked={f.critical} onChange={(e) => setF({ ...f, critical: e.target.checked })} />Mark as critical history (shown in emergency access)</label>
      </form>
    </Modal>
  );
}

function PrescribeModal({ patient, onClose, onDone }) {
  const toast = useToast();
  const { run, saving, fieldErrors } = useAction(toast);
  const [f, setF] = useState({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [errs, setErrs] = useState({});
  const allergyHit = patient.allergies.find((a) => f.medication.trim().length > 2 && (a.name.toLowerCase().includes(f.medication.trim().toLowerCase()) || f.medication.trim().toLowerCase().includes(a.name.toLowerCase().split(/[ /]/)[0])));
  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (f.medication.trim().length < 2) e2.medication = 'Enter the medication';
    if (!f.dosage.trim()) e2.dosage = 'Enter the dosage';
    if (!f.frequency.trim()) e2.frequency = 'Enter the frequency';
    setErrs(e2);
    if (Object.keys(e2).length) return;
    const ok = await run(() => api.post(`/doctor/patients/${patient._id}/prescriptions`, f), 'Prescription created');
    if (ok) { onDone(); onClose(); }
  };
  const err = (k) => errs[k] || fieldErrors[k];
  return (
    <Modal open onClose={onClose} title={`New prescription for ${patient.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} icon={Pill}>Prescribe</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {patient.allergies.length > 0 && <Alert tone="red" className="sm:col-span-2" title="Known allergies">{patient.allergies.map((a) => `${a.name} (${a.severity})`).join(', ')}</Alert>}
        {allergyHit && <Alert tone="red" className="sm:col-span-2" title="Possible allergy match">“{f.medication}” may conflict with the recorded {allergyHit.name} allergy. Please verify before prescribing.</Alert>}
        <Input className="sm:col-span-2" label="Medication" required value={f.medication} onChange={(e) => setF({ ...f, medication: e.target.value })} error={err('medication')} />
        <Input label="Dosage" required value={f.dosage} onChange={(e) => setF({ ...f, dosage: e.target.value })} error={err('dosage')} placeholder="500 mg" />
        <Input label="Frequency" required value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} error={err('frequency')} placeholder="Twice daily" />
        <Input label="Duration" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="14 days" />
        <Textarea className="sm:col-span-2" label="Instructions" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
      </form>
    </Modal>
  );
}

export default function PatientHistory() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(`/doctor/patients/${patientId}`);
  const [modal, setModal] = useState(null); // 'record' | 'rx' | 'upload' | {record}

  if (loading) return <PageSkeleton />;
  if (error) return (
    <div className="mx-auto mt-10 max-w-lg text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700"><Lock className="h-7 w-7" /></div>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">{error.status === 403 ? 'Access not granted' : 'Unable to load record'}</h1>
      <p className="mt-2 text-sm text-slate-600">{error.message}</p>
      <div className="mt-5 flex justify-center gap-2"><Button as={Link} to="/doctor/search" variant="secondary">Back to search</Button>{error.status === 403 && <Button as={Link} to="/doctor/emergency" variant="danger">Emergency access</Button>}</div>
    </div>
  );

  const { patient, records, prescriptions, labs, contacts } = data;
  const mine = (r) => r.doctor?.id === user.doctorId;
  const canPrescribe = user.permissions?.prescribe !== false;

  return (
    <>
      <PageHeader title="Patient medical history" crumbs={[{ label: 'Dashboard', to: '/doctor' }, { label: 'Patients', to: '/doctor/search' }, { label: patient.name }]}
        actions={<><Button variant="secondary" icon={UploadCloud} onClick={() => setModal('upload')}>Upload report</Button>{canPrescribe && <Button variant="secondary" icon={Pill} onClick={() => setModal('rx')}>Prescribe</Button>}<Button icon={ClipboardPlus} onClick={() => setModal('record')}>Add diagnosis / note</Button></>} />

      <Card padded={false} className="mb-6">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={patient.name} size="lg" />
          <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold text-slate-900">{patient.name}</h2><p className="text-sm text-slate-500">{patient.age} yrs · {patient.gender} · <span className="font-mono text-brand-700">{patient.uhrId}</span></p><p className="text-sm text-slate-500">{patient.phone} · {patient.email}</p></div>
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-red-700"><Droplets className="h-5 w-5" /><span className="text-2xl font-bold">{patient.bloodGroup}</span></div>
        </div>
        {patient.criticalNotes && <div className="flex items-start gap-2 border-t border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{patient.criticalNotes}</div>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Card title="Allergies">{patient.allergies.length ? <div className="flex flex-wrap gap-2">{patient.allergies.map((a) => <span key={a._id} title={a.reaction} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[a.severity]}`}>{a.name} · {a.severity}</span>)}</div> : <p className="text-sm text-slate-500">No known allergies</p>}</Card>
          <Card title="Conditions">{patient.conditions.length ? <ul className="space-y-2">{patient.conditions.map((c) => <li key={c._id} className="text-sm"><span className="font-medium text-slate-900">{c.name}</span> {c.critical && <Badge tone="red">critical</Badge>}<p className="text-xs text-slate-500">{[c.since && `since ${c.since}`, c.notes].filter(Boolean).join(' · ')}</p></li>)}</ul> : <p className="text-sm text-slate-500">None recorded</p>}</Card>
          <Card title="Current medications">{patient.medications.length ? <ul className="space-y-1.5 text-sm">{patient.medications.map((m) => <li key={m._id}><span className="font-medium text-slate-900">{m.name}</span> <span className="text-slate-500">{[m.dose, m.frequency].filter(Boolean).join(' · ')}</span></li>)}</ul> : <p className="text-sm text-slate-500">None recorded</p>}</Card>
          <Card title="Surgeries & vaccinations">
            <ul className="space-y-1 text-sm text-slate-700">{patient.surgeries.map((s) => <li key={s._id}>{s.name} {s.year && <span className="text-slate-500">({s.year})</span>}</li>)}{patient.vaccinations.map((v) => <li key={v._id}>{v.name} {v.date && <span className="text-slate-500">({v.date})</span>}</li>)}{!patient.surgeries.length && !patient.vaccinations.length && <li className="text-slate-500">None recorded</li>}</ul>
          </Card>
          <Card title="Emergency contacts">{contacts.length ? <ul className="space-y-1.5 text-sm">{contacts.map((c) => <li key={c._id}><span className="font-medium">{c.name}</span> <span className="text-slate-500">{c.relation} · {c.phone}</span></li>)}</ul> : <EmptyState title="None on file" />}</Card>
        </div>

        <Card className="xl:col-span-2" title="Clinical history">
          <RecordTabs records={records} prescriptions={prescriptions} labs={labs}
            recordActions={(r) => mine(r) && <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${r.title}`} onClick={() => setModal({ record: r })} />} />
        </Card>
      </div>

      {modal === 'record' && <RecordModal patientId={patientId} onClose={() => setModal(null)} onDone={reload} />}
      {modal?.record && <RecordModal patientId={patientId} record={modal.record} onClose={() => setModal(null)} onDone={reload} />}
      {modal === 'rx' && <PrescribeModal patient={patient} onClose={() => setModal(null)} onDone={reload} />}
      <UploadReportModal open={modal === 'upload'} onClose={() => setModal(null)} endpoint={`/doctor/patients/${patientId}/reports`} onDone={reload} />
    </>
  );
}
