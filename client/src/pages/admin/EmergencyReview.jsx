import { useState } from 'react';
import { CheckCircle2, Flag, Siren } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, PageSkeleton, Tabs, Textarea } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

const TONE = { pending: 'amber', justified: 'green', flagged: 'red' };

export default function EmergencyReview() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/admin/emergency-logs');
  const [tab, setTab] = useState('pending');
  const [target, setTarget] = useState(null); // { log, status }
  const [note, setNote] = useState('');
  const act = useAction(toast);
  if (loading) return <PageSkeleton rows={1} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const count = (s) => data.logs.filter((l) => l.review?.status === s).length;
  const rows = tab === 'all' ? data.logs : data.logs.filter((l) => l.review?.status === tab);
  const submit = async () => {
    if (await act.run(() => api.put(`/admin/emergency-logs/${target.log._id}/review`, { status: target.status, note: note || undefined }), `Marked ${target.status}`)) { setTarget(null); setNote(''); reload(); }
  };

  return (
    <>
      <PageHeader title="Emergency access review" subtitle="Every break-glass event, with the doctor's stated reason. Review each for appropriateness." crumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Emergency review' }]} actions={<Badge tone="amber">Demonstration data</Badge>} />
      <Card padded={false}>
        <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'pending', label: 'Needs review', count: count('pending') }, { id: 'justified', label: 'Justified', count: count('justified') }, { id: 'flagged', label: 'Flagged', count: count('flagged') }, { id: 'all', label: 'All', count: data.logs.length }]} /></div>
        {rows.length === 0 ? <EmptyState icon={Siren} title="Nothing in this view" message="Emergency access events will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((l) => (
              <li key={l._id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{l.doctorName}</p><span className="text-slate-400">→</span><p className="font-medium text-slate-800">{l.patientName}</p><span className="font-mono text-xs text-brand-700">{l.uhrId}</span>
                    <Badge tone={TONE[l.review?.status]}>{l.review?.status}</Badge>{l.active && <Badge tone="solidRed">active now</Badge>}<Badge tone="slate">{l.method === 'qr' ? 'QR scan' : 'UHR ID'}</Badge></div>
                  <p className="mt-1.5 text-sm text-slate-700">“{l.reason}”</p>
                  <p className="mt-1 text-xs text-slate-500">{fmtDateTime(l.startedAt)} · expires {fmtDateTime(l.expiresAt)} · {l.notified?.length || 0} contact(s) notified (simulated){l.accessedSections?.length ? ` · viewed: ${l.accessedSections.join(', ')}` : ''}</p>
                  {l.review?.note && <p className="mt-1 text-xs italic text-slate-500">Reviewer note: {l.review.note}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="teal" icon={CheckCircle2} onClick={() => { setTarget({ log: l, status: 'justified' }); setNote(l.review?.note || ''); }}>Justified</Button>
                  <Button size="sm" variant="secondary" icon={Flag} className="text-red-700" onClick={() => { setTarget({ log: l, status: 'flagged' }); setNote(l.review?.note || ''); }}>Flag</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={!!target} onClose={() => setTarget(null)} title={target?.status === 'flagged' ? 'Flag as inappropriate' : 'Mark as justified'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant={target?.status === 'flagged' ? 'danger' : 'teal'} loading={act.saving} onClick={submit}>Confirm</Button></>}>
        <p className="mb-3 text-sm text-slate-600">{target?.log.doctorName} accessed {target?.log.patientName}'s record. Reason: “{target?.log.reason}”</p>
        <Textarea label="Reviewer note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      </Modal>
    </>
  );
}
