import { useState, useMemo } from 'react';
import { CalendarDays, CalendarPlus, CalendarClock, XCircle } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Input, Modal, PageHeader, PageSkeleton, Select, Tabs, Textarea } from '../../components/ui';
import { fmtDateTime, clinicParts, slotToIso, isClosedDay, SLOTS } from '../../utils/format';

const TONE = { pending: 'amber', confirmed: 'green', completed: 'slate', cancelled: 'red' };
const TOMORROW_CLINIC = clinicParts(Date.now() + 24 * 3600 * 1000).date;
const TODAY_CLINIC = clinicParts(Date.now()).date;

function BookModal({ onClose, onDone, appointment }) {
  const toast = useToast();
  const doctors = useApi('/doctors', { skip: !!appointment });
  const { run, saving, fieldErrors } = useAction(toast);
  const initial = appointment ? clinicParts(appointment.scheduledAt) : { date: TOMORROW_CLINIC, time: '10:00' };
  const [f, setF] = useState({ doctorId: '', reason: '', shareRecord: false, ...initial });
  const [errs, setErrs] = useState({});
  const doctorName = doctors.data?.doctors.find((d) => d.id === f.doctorId)?.name;

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!appointment && !f.doctorId) e2.doctorId = 'Choose a doctor';
    if (!f.date) e2.scheduledAt = 'Choose a date';
    else if (isClosedDay(f.date)) e2.scheduledAt = 'The clinic is closed on Sundays';
    else if (new Date(slotToIso(f.date, f.time)) <= new Date()) e2.scheduledAt = 'Choose a future date and time';
    if (!appointment && f.reason.trim().length < 3) e2.reason = 'Describe the reason for your visit';
    setErrs(e2);
    if (Object.keys(e2).length) return;
    const scheduledAt = slotToIso(f.date, f.time);
    const ok = await run(
      () => (appointment
        ? api.put(`/patient/appointments/${appointment._id}`, { scheduledAt })
        : api.post('/patient/appointments', { doctorId: f.doctorId, reason: f.reason, shareRecord: f.shareRecord, scheduledAt })),
      appointment ? 'Appointment rescheduled' : 'Appointment requested');
    if (ok) { onDone(); onClose(); }
  };
  const err = (k) => errs[k] || fieldErrors[k];

  return (
    <Modal open onClose={onClose} title={appointment ? 'Reschedule appointment' : 'Book an appointment'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>{appointment ? 'Reschedule' : 'Request appointment'}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {appointment ? <p className="text-sm text-slate-600">With <b>{appointment.doctor?.name}</b> · {appointment.reason}</p> : (
          <Select label="Doctor" required value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value })} error={err('doctorId')}>
            <option value="">{doctors.loading ? 'Loading…' : 'Select a doctor'}</option>
            {doctors.data?.doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>)}
          </Select>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" required value={f.date} min={TODAY_CLINIC} onChange={(e) => { setF({ ...f, date: e.target.value }); setErrs({ ...errs, scheduledAt: undefined }); }} error={err('scheduledAt')} />
          <Select label="Time slot" required value={f.time} onChange={(e) => { setF({ ...f, time: e.target.value }); setErrs({ ...errs, scheduledAt: undefined }); }}>
            {SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <p className="-mt-2 text-xs text-slate-500">Monday to Saturday, 09:00–17:00 (India time), 30-minute slots.</p>
        {!appointment && <Textarea label="Reason for visit" required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} error={err('reason')} />}
        {!appointment && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-brand-600)]" checked={f.shareRecord} onChange={(e) => setF({ ...f, shareRecord: e.target.checked })} />
            <span><b>Share my medical record with {doctorName || 'this doctor'}</b> (optional)<br /><span className="text-xs text-slate-500">Lets them view your history before the visit. You can withdraw access at any time under Privacy &amp; access.</span></span>
          </label>
        )}
      </form>
    </Modal>
  );
}

export default function Appointments() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/patient/appointments');
  const [tab, setTab] = useState('upcoming');
  const [modal, setModal] = useState(null); // {} | { appointment }
  const [cancel, setCancel] = useState(null);
  const act = useAction(toast);

  const { upcoming, history } = useMemo(() => {
    if (!data?.appointments) return { upcoming: [], history: [] };
    const now = Date.now();
    const up = data.appointments
      .filter((a) => ['pending', 'confirmed'].includes(a.status) && new Date(a.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const hist = data.appointments.filter((a) => !up.includes(a));
    return { upcoming: up, history: hist };
  }, [data]);

  if (loading) return <PageSkeleton rows={2} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const doCancel = async () => { if (await act.run(() => api.delete(`/patient/appointments/${cancel._id}`), 'Appointment cancelled')) { setCancel(null); reload(); } };

  const columns = (withActions) => [
    { header: 'Doctor', render: (a) => <div><p className="font-medium text-slate-900">{a.doctor?.name}</p><p className="text-xs text-slate-500">{a.doctor?.specialty}</p></div> },
    { header: 'When', render: (a) => fmtDateTime(a.scheduledAt) },
    { header: 'Reason', key: 'reason', className: 'max-w-xs text-slate-600' },
    { header: 'Status', render: (a) => <Badge tone={TONE[a.status]}>{a.status}</Badge> },
    ...(withActions ? [{ header: '', className: 'text-right', render: (a) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" icon={CalendarClock} onClick={() => setModal({ appointment: a })}>Reschedule</Button>
        <Button variant="dangerGhost" size="sm" icon={XCircle} onClick={() => setCancel(a)}>Cancel</Button>
      </div>
    ) }] : []),
  ];

  return (
    <>
      <PageHeader title="Appointments" subtitle="Schedule visits during clinic hours (Mon–Sat, 09:00–17:00 IST)."
        actions={<Button icon={CalendarPlus} onClick={() => setModal({})}>Book appointment</Button>} />

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={[{ id: 'upcoming', label: 'Upcoming', count: upcoming.length }, { id: 'history', label: 'Past & cancelled', count: history.length }]} value={tab} onChange={setTab} /></div>
        <div className="p-5">
          {tab === 'upcoming' ? (
            <DataTable columns={columns(true)} rows={upcoming}
              empty={<EmptyState icon={CalendarDays} title="No upcoming appointments" message="Book a consultation with a verified clinician." action={<Button icon={CalendarPlus} size="sm" onClick={() => setModal({})}>Book appointment</Button>} />} />
          ) : (
            <DataTable columns={columns(false)} rows={history} empty={<EmptyState icon={CalendarDays} title="No past appointments" />} />
          )}
        </div>
      </Card>

      {modal && <BookModal appointment={modal.appointment} onClose={() => setModal(null)} onDone={reload} />}
      <ConfirmDialog open={Boolean(cancel)} onClose={() => setCancel(null)} onConfirm={doCancel} loading={act.saving}
        title="Cancel appointment" message={`Cancel your visit with ${cancel?.doctor?.name} on ${fmtDateTime(cancel?.scheduledAt)}?`} confirmLabel="Cancel appointment" danger />
    </>
  );
}
