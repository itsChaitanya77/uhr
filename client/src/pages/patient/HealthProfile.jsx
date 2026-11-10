import { useState } from 'react';
import { AlertTriangle, Pencil, Plus, Scissors, ShieldPlus, Syringe, Pill, Stethoscope, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, PageSkeleton, Select, Textarea } from '../../components/ui';
import { SEVERITY_STYLE } from '../../utils/format';

const BLOOD = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SECTIONS = [
  { key: 'allergies', title: 'Allergies', icon: AlertTriangle, noun: 'allergy', empty: 'No known allergies recorded',
    fields: [{ key: 'name', label: 'Allergen', required: true, placeholder: 'e.g. Penicillin' }, { key: 'severity', label: 'Severity', type: 'select', options: ['mild', 'moderate', 'severe', 'life-threatening'], default: 'moderate' }, { key: 'reaction', label: 'Reaction', placeholder: 'e.g. Anaphylaxis, rash', full: true }],
    line: (i) => <><span className="font-medium text-slate-900">{i.name}</span><span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[i.severity]}`}>{i.severity}</span>{i.reaction && <p className="text-sm text-slate-500">{i.reaction}</p>}</> },
  { key: 'conditions', title: 'Chronic conditions', icon: Stethoscope, noun: 'condition', empty: 'No conditions recorded',
    fields: [{ key: 'name', label: 'Condition', required: true }, { key: 'since', label: 'Since (year)', placeholder: '2018' }, { key: 'notes', label: 'Notes', full: true }, { key: 'critical', label: 'Show as critical alert in emergencies', type: 'checkbox', full: true }],
    line: (i) => <><span className="font-medium text-slate-900">{i.name}</span>{i.critical && <Badge tone="red" className="ml-2">critical</Badge>}<p className="text-sm text-slate-500">{[i.since && `Since ${i.since}`, i.notes].filter(Boolean).join(' · ')}</p></> },
  { key: 'medications', title: 'Current medications', icon: Pill, noun: 'medication', empty: 'No current medications',
    fields: [{ key: 'name', label: 'Medication', required: true }, { key: 'dose', label: 'Dose', placeholder: '500 mg' }, { key: 'frequency', label: 'Frequency', placeholder: 'Twice daily', full: true }],
    line: (i) => <><span className="font-medium text-slate-900">{i.name}</span><p className="text-sm text-slate-500">{[i.dose, i.frequency].filter(Boolean).join(' · ')}</p></> },
  { key: 'surgeries', title: 'Previous surgeries', icon: Scissors, noun: 'surgery', empty: 'No surgeries recorded',
    fields: [{ key: 'name', label: 'Procedure', required: true }, { key: 'year', label: 'Year', placeholder: '2019' }, { key: 'notes', label: 'Notes', full: true }],
    line: (i) => <><span className="font-medium text-slate-900">{i.name}</span>{i.year && <span className="ml-2 text-sm text-slate-500">{i.year}</span>}{i.notes && <p className="text-sm text-slate-500">{i.notes}</p>}</> },
  { key: 'vaccinations', title: 'Vaccination history', icon: Syringe, noun: 'vaccination', empty: 'No vaccinations recorded',
    fields: [{ key: 'name', label: 'Vaccine', required: true }, { key: 'date', label: 'Date', placeholder: '2024-03' }],
    line: (i) => <><span className="font-medium text-slate-900">{i.name}</span>{i.date && <span className="ml-2 text-sm text-slate-500">{i.date}</span>}</> },
];

function ItemModal({ section, item, onClose, onSubmit, saving, serverErrors }) {
  const initial = Object.fromEntries(section.fields.map((f) => [f.key, item?.[f.key] ?? f.default ?? (f.type === 'checkbox' ? false : '')]));
  const [v, setV] = useState(initial);
  const [errs, setErrs] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const e2 = {};
    section.fields.forEach((f) => { if (f.required && !String(v[f.key]).trim()) e2[f.key] = `${f.label} is required`; });
    setErrs(e2);
    if (!Object.keys(e2).length) onSubmit({ ...item, ...v });
  };
  return (
    <Modal open onClose={onClose} title={`${item ? 'Edit' : 'Add'} ${section.noun}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {section.fields.map((f) => {
          const error = errs[f.key] || Object.entries(serverErrors || {}).find(([k]) => k.endsWith(`.${f.key}`))?.[1];
          const span = f.full ? 'sm:col-span-2' : '';
          if (f.type === 'select') return <Select key={f.key} className={span} label={f.label} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</Select>;
          if (f.type === 'checkbox') return <label key={f.key} className={`flex items-center gap-2 text-sm text-slate-700 ${span}`}><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.checked })} />{f.label}</label>;
          return <Input key={f.key} className={span} label={f.label} required={f.required} value={v[f.key]} placeholder={f.placeholder} error={error} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />;
        })}
      </form>
    </Modal>
  );
}

function Section({ section, items, onSave, saving, serverErrors }) {
  const [editing, setEditing] = useState(null); // { index|-1, item }
  const [removing, setRemoving] = useState(null);
  const Icon = section.icon;
  const persist = async (next) => (await onSave(section.key, next)) && (setEditing(null), setRemoving(null));
  const clean = (it) => { const { _id, ...rest } = it; void _id; return rest; };

  return (
    <Card title={<span className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{section.title}</span>}
      action={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setEditing({ index: -1 })}>Add</Button>}>
      {items.length === 0 ? <EmptyState title={section.empty} message="Add details so doctors can treat you safely." /> : (
        <ul className="divide-y divide-slate-100">
          {items.map((it, index) => (
            <li key={it._id || index} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">{section.line(it)}</div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" icon={Pencil} aria-label={`Edit ${it.name}`} onClick={() => setEditing({ index, item: it })} />
                <Button variant="dangerGhost" size="sm" icon={Trash2} aria-label={`Remove ${it.name}`} onClick={() => setRemoving(index)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ItemModal section={section} item={editing.item} saving={saving} serverErrors={serverErrors} onClose={() => setEditing(null)}
        onSubmit={(val) => persist(editing.index === -1 ? [...items.map(clean), clean(val)] : items.map((x, i) => clean(i === editing.index ? val : x)))} />}
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} danger loading={saving} title={`Remove ${section.noun}?`} confirmLabel="Remove"
        message={`"${items[removing]?.name}" will be removed from your health profile.`} onConfirm={() => persist(items.filter((_, i) => i !== removing).map(clean))} />
    </Card>
  );
}

export default function HealthProfile() {
  const { data, loading, error, reload, setData } = useApi('/patient/profile');
  const toast = useToast();
  const health = useAction(toast);
  const prof = useAction(toast);
  const [form, setForm] = useState(null);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const patient = data.patient;
  const f = form || { bloodGroup: patient.bloodGroup, address: patient.address || '', criticalNotes: patient.criticalNotes || '' };

  const saveSection = async (key, items) => {
    const res = await health.run(() => api.put('/patient/health', { [key]: items }), 'Health profile updated');
    if (res) setData({ ...data, patient: res.patient });
    return Boolean(res);
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    const res = await prof.run(() => api.put('/patient/profile', f), 'Profile saved');
    if (res) { setData({ ...data, patient: res.patient }); setForm(null); }
  };

  return (
    <>
      <PageHeader title="Health profile" subtitle="Keep this accurate. It's what doctors see first in an emergency." crumbs={[{ label: 'Home', to: '/patient' }, { label: 'Health profile' }]} />
      <Card title={<span className="flex items-center gap-2"><ShieldPlus className="h-4 w-4 text-brand-600" />Basics &amp; critical notes</span>} className="mb-6">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-3">
          <Select label="Blood group" value={f.bloodGroup} onChange={(e) => setForm({ ...f, bloodGroup: e.target.value })}>{BLOOD.map((b) => <option key={b}>{b}</option>)}</Select>
          <Input className="sm:col-span-2" label="Address" value={f.address} onChange={(e) => setForm({ ...f, address: e.target.value })} error={prof.fieldErrors.address} />
          <Textarea className="sm:col-span-3" label="Critical information for emergency staff" value={f.criticalNotes} error={prof.fieldErrors.criticalNotes} onChange={(e) => setForm({ ...f, criticalNotes: e.target.value })} hint="e.g. 'On warfarin: bleeding risk', 'Carries adrenaline auto-injector'" />
          <div className="sm:col-span-3"><Button type="submit" loading={prof.saving} disabled={!form}>Save changes</Button></div>
        </form>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {SECTIONS.map((s) => <Section key={s.key} section={s} items={patient[s.key] || []} onSave={saveSection} saving={health.saving} serverErrors={health.fieldErrors} />)}
      </div>
    </>
  );
}
