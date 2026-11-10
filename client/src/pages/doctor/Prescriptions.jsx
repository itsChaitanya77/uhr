import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, PageHeader, PageSkeleton, Select } from '../../components/ui';
import { fmtDate } from '../../utils/format';

const TONE = { active: 'green', completed: 'slate', discontinued: 'red' };

export default function Prescriptions() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/doctor/prescriptions');
  const [filter, setFilter] = useState('all');
  const [target, setTarget] = useState(null); // { rx, status }
  const act = useAction(toast);
  if (loading) return <PageSkeleton rows={1} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const rows = data.prescriptions.filter((r) => filter === 'all' || r.status === filter);
  const apply = async () => {
    if (await act.run(() => api.put(`/doctor/prescriptions/${target.rx._id}`, { status: target.status }), `Prescription marked ${target.status}`)) { setTarget(null); reload(); }
  };

  return (
    <>
      <PageHeader title="Prescription management" subtitle="Everything you've prescribed. New prescriptions are written from a patient's record." crumbs={[{ label: 'Dashboard', to: '/doctor' }, { label: 'Prescriptions' }]}
        actions={<Select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44"><option value="all">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="discontinued">Discontinued</option></Select>} />
      <Card padded={false}>
        <DataTable rowKey="_id" rows={rows} empty={<EmptyState icon={Pill} title="No prescriptions" message="Open a patient's record to write one." action={<Button as={Link} to="/doctor/search" size="sm">Find a patient</Button>} />}
          columns={[
            { header: 'Medication', render: (r) => <div><p className="font-medium text-slate-900">{r.medication}</p><p className="text-xs text-slate-500">{r.instructions}</p></div> },
            { header: 'Dosage', render: (r) => `${r.dosage} · ${r.frequency}` },
            { header: 'Patient', render: (r) => <Link to={`/doctor/patients/${r.patient.id}`} className="text-brand-700 hover:underline">{r.patient.name}</Link> },
            { header: 'Date', render: (r) => fmtDate(r.prescribedAt) },
            { header: 'Status', render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
            { header: '', className: 'text-right', render: (r) => r.status === 'active' && (
              <div className="flex justify-end gap-1"><Button size="sm" variant="secondary" onClick={() => setTarget({ rx: r, status: 'completed' })}>Complete</Button><Button size="sm" variant="dangerGhost" onClick={() => setTarget({ rx: r, status: 'discontinued' })}>Discontinue</Button></div>) },
          ]} />
      </Card>
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} onConfirm={apply} loading={act.saving} danger={target?.status === 'discontinued'} title={`Mark as ${target?.status}?`} confirmLabel={`Mark ${target?.status}`}
        message={target ? `${target.rx.medication} for ${target.rx.patient.name} will be removed from their current medication list.` : ''} />
    </>
  );
}
