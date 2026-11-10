import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCheck, CalendarDays, X } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, PageHeader, PageSkeleton, Tabs } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

const TONE = { pending: 'amber', confirmed: 'green', completed: 'slate', cancelled: 'red' };

export default function DoctorAppointments() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/doctor/appointments');
  const [tab, setTab] = useState('upcoming');
  const act = useAction(toast);
  if (loading) return <PageSkeleton rows={1} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = async (a, status) => { if (await act.run(() => api.put(`/doctor/appointments/${a._id}`, { status }), `Appointment ${status}`)) reload(); };
  const upcoming = data.appointments.filter((a) => ['pending', 'confirmed'].includes(a.status)).sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt));
  const past = data.appointments.filter((a) => !upcoming.includes(a));

  const columns = [
    { header: 'When', render: (a) => <span className="whitespace-nowrap">{fmtDateTime(a.scheduledAt)}</span> },
    { header: 'Patient', render: (a) => <div><p className="font-medium text-slate-900">{a.patient.name}</p><p className="font-mono text-xs text-slate-500">{a.patient.uhrId}</p></div> },
    { header: 'Reason', key: 'reason', className: 'max-w-xs text-slate-600' },
    { header: 'Status', render: (a) => <Badge tone={TONE[a.status]}>{a.status}</Badge> },
    { header: '', className: 'text-right', render: (a) => (
      <div className="flex flex-wrap justify-end gap-1">
        {a.status === 'pending' && <Button size="sm" variant="teal" icon={Check} loading={act.saving} onClick={() => set(a, 'confirmed')}>Confirm</Button>}
        {a.status === 'confirmed' && <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => set(a, 'completed')}>Complete</Button>}
        {['pending', 'confirmed'].includes(a.status) && <Button size="sm" variant="dangerGhost" icon={X} onClick={() => set(a, 'cancelled')}>Decline</Button>}
        {a.patient.hasAccess && <Button as={Link} size="sm" variant="ghost" to={`/doctor/patients/${a.patient.id}`}>Record</Button>}
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Appointments" crumbs={[{ label: 'Dashboard', to: '/doctor' }, { label: 'Appointments' }]} />
      <Card padded={false}>
        <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'upcoming', label: 'Upcoming', count: upcoming.length }, { id: 'past', label: 'Past & cancelled', count: past.length }]} /></div>
        <DataTable rowKey="_id" columns={columns} rows={tab === 'upcoming' ? upcoming : past} empty={<EmptyState icon={CalendarDays} title="No appointments" />} />
      </Card>
    </>
  );
}
