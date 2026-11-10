import { useState } from 'react';
import { Eye, ShieldAlert, ShieldCheck, Siren } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, PageSkeleton } from '../../components/ui';
import { fmtDateTime, timeAgo } from '../../utils/format';

const ACTION_LABEL = {
  VIEW_PATIENT_RECORD: 'Doctor viewed your full record', EMERGENCY_ACCESS_ACTIVATED: 'Emergency access activated', EMERGENCY_VIEW: 'Emergency profile viewed',
  ACCESS_GRANTED: 'You granted access', ACCESS_REVOKED: 'You revoked access', FILE_VIEWED: 'Report file opened',
};

export default function AccessControl() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi('/patient/access');
  const [revoke, setRevoke] = useState(null);
  const act = useAction(toast);

  if (loading) return <PageSkeleton rows={2} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const setGrant = async (doctor, granted) => {
    const ok = await act.run(() => api.put(`/patient/access/${doctor.id}`, { granted }), granted ? `${doctor.name} can now view your record` : `Access removed for ${doctor.name}`);
    if (ok) { setData({ ...data, doctors: data.doctors.map((d) => (d.id === doctor.id ? { ...d, granted } : d)) }); setRevoke(null); reload(); }
  };

  return (
    <>
      <PageHeader title="Privacy & access" subtitle="You decide which doctors can view your full record." crumbs={[{ label: 'Home', to: '/patient' }, { label: 'Privacy & access' }]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Doctor access" subtitle="Verified doctors on the platform">
          <ul className="divide-y divide-slate-100">
            {data.doctors.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={d.name} tone="teal" />
                <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{d.name}</p><p className="truncate text-xs text-slate-500">{d.specialty} · {d.hospital}</p></div>
                {d.granted ? <Button size="sm" variant="dangerGhost" onClick={() => setRevoke(d)}>Revoke</Button> : <Button size="sm" variant="secondary" loading={act.saving} onClick={() => setGrant(d, true)}>Grant access</Button>}
                <Badge tone={d.granted ? 'green' : 'slate'}>{d.granted ? 'Has access' : 'No access'}</Badge>
              </li>
            ))}
          </ul>
          <Alert tone="amber" icon={Siren} className="mt-5" title="Emergency (break-glass) access">Even without your permission, a verified doctor can open your <b>emergency profile</b> if you can't communicate. They must give a reason, access expires automatically, and you're notified. It's always logged.</Alert>
        </Card>

        <Card title="Emergency access history" subtitle="Every time a doctor broke the glass on your record" action={<ShieldAlert className="h-5 w-5 text-slate-400" />}>
          {data.emergencyLogs.length === 0 ? <EmptyState icon={ShieldCheck} title="No emergency access so far" message="If a doctor ever opens your emergency profile, it'll be listed here." /> : (
            <ul className="space-y-3">
              {data.emergencyLogs.map((l) => (
                <li key={l._id} className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{l.doctorName}</p><Badge tone="red">{l.method === 'qr' ? 'QR scan' : 'UHR ID'}</Badge></div>
                  <p className="mt-1 text-sm text-slate-700">“{l.reason}”</p>
                  <p className="mt-1 text-xs text-slate-500">{fmtDateTime(l.startedAt)} · {l.review?.status === 'justified' ? 'Reviewed: justified' : l.review?.status === 'flagged' ? 'Flagged by admin' : 'Awaiting admin review'}{l.isDemo && ' · demo'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Recent access activity" subtitle="Who has looked at your data" action={<Eye className="h-5 w-5 text-slate-400" />}>
          {data.activity.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ul className="divide-y divide-slate-100">
              {data.activity.map((a) => (
                <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span><span className="font-medium text-slate-900">{ACTION_LABEL[a.action] || a.action}</span><span className="text-slate-500"> · {a.actorName}</span></span>
                  <span className="text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <ConfirmDialog open={!!revoke} onClose={() => setRevoke(null)} danger loading={act.saving} onConfirm={() => setGrant(revoke, false)} title="Revoke doctor access?" confirmLabel="Revoke access" message={`${revoke?.name} will no longer be able to view your medical record. Emergency access is unaffected.`} />
    </>
  );
}
