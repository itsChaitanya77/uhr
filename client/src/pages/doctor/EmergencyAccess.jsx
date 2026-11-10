import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertOctagon, ArrowRight, Eye, EyeOff, ScanLine, Search, ShieldAlert, Siren } from 'lucide-react';
import api, { apiError } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Textarea } from '../../components/ui';
import QrScanner from '../../components/QrScanner';
import { fmtDateTime } from '../../utils/format';

const REASONS = ['Patient unconscious, unable to communicate', 'Patient in cardiac arrest / critical condition', 'Patient confused or unresponsive after trauma', 'Seizure: post-ictal, cannot give history'];

function ActivateModal({ target, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [ack, setAck] = useState(false);
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (reason.trim().length < 15) e2.reason = 'Describe the emergency in at least 15 characters';
    if (!password) e2.password = 'Re-enter your password to verify your identity';
    if (!ack) e2.ack = 'You must acknowledge this warning';
    setErrs(e2);
    if (Object.keys(e2).length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/emergency/activate', { patientId: target.patient.id, method: target.method, reason, password, acknowledged: true });
      toast.success(`Emergency access granted for ${data.windowMinutes} minutes`);
      navigate(`/emergency/${data.sessionId}`);
    } catch (err) {
      const p = apiError(err);
      setErrs(p.fieldErrors?.password ? { password: p.fieldErrors.password } : { form: p.message, ...p.fieldErrors });
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} tone="danger" title="Break-glass emergency access" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" icon={Siren} loading={saving} onClick={submit}>Activate emergency access</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Alert tone="red" icon={AlertOctagon} title="Read before continuing">
          You are about to open <b>{target.patient.name}</b>'s emergency medical profile without their consent. This is for genuine emergencies only. Your name, the reason, the time and every record you see will be <b>permanently logged</b>, the patient and their emergency contacts will be <b>notified</b>, and an administrator will <b>review</b> this access. Access expires automatically.
        </Alert>
        <Alert tone="amber" icon={ShieldAlert}>Demonstration mode: contact notifications are simulated, and all patient data is synthetic.</Alert>
        {errs.form && <Alert tone="red">{errs.form}</Alert>}
        <div>
          <Textarea label="Emergency reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={errs.reason} placeholder="Why is emergency access needed right now?" />
          <div className="mt-2 flex flex-wrap gap-1.5">{REASONS.map((r) => <button type="button" key={r} onClick={() => setReason(r)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-red-300 hover:bg-red-50">{r}</button>)}</div>
        </div>
        <div className="relative">
          <Input label="Confirm your identity: password" required type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errs.password} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-[34px] text-slate-400">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <div><label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600" />I confirm this is a genuine medical emergency and understand my access is audited.</label>{errs.ack && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errs.ack}</p>}</div>
      </form>
    </Modal>
  );
}

export default function EmergencyAccess() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [uhrId, setUhrId] = useState(params.get('uhrId') || '');
  const [scanner, setScanner] = useState(params.get('scan') === '1');
  const [found, setFound] = useState(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [activate, setActivate] = useState(false);
  const sessions = useApi('/emergency/my-sessions');

  const lookup = async (payload) => {
    setLooking(true); setError(''); setFound(null);
    try {
      const { data } = await api.post('/emergency/lookup', payload);
      setFound(data);
    } catch (err) { setError(apiError(err).message); } finally { setLooking(false); }
  };
  useEffect(() => { if (params.get('uhrId')) lookup({ uhrId: params.get('uhrId') }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScan = (text) => { setScanner(false); toast.success('QR code read'); lookup({ qrToken: text }); };

  return (
    <>
      <PageHeader title="Emergency access" subtitle="Identify an unresponsive patient to open their emergency medical profile." crumbs={[{ label: 'Dashboard', to: '/doctor' }, { label: 'Emergency access' }]} actions={<Badge tone="amber">Demonstration</Badge>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="border-red-200" title={<span className="flex items-center gap-2 text-red-800"><Siren className="h-5 w-5" />Step 1: identify the patient</span>}>
            <Button size="lg" variant="danger" icon={ScanLine} className="w-full" onClick={() => setScanner(true)}>Scan emergency QR code</Button>
            <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
            <form onSubmit={(e) => { e.preventDefault(); if (uhrId.trim()) lookup({ uhrId: uhrId.trim() }); }} className="flex gap-2">
              <Input className="flex-1" aria-label="UHR ID" value={uhrId} onChange={(e) => setUhrId(e.target.value.toUpperCase())} placeholder="UHR-1000003" />
              <Button type="submit" size="lg" className="h-10" variant="secondary" icon={Search} loading={looking}>Look up</Button>
            </form>
            {error && <Alert tone="red" className="mt-4">{error}</Alert>}
          </Card>

          {found && (
            <Card className="border-red-300 ring-2 ring-red-100" title="Step 2: confirm and activate">
              <div className="flex items-center gap-4">
                <Avatar name={found.patient.name} size="lg" tone="red" />
                <div className="min-w-0 flex-1"><p className="text-lg font-semibold text-slate-900">{found.patient.name}</p><p className="text-sm text-slate-500">{found.patient.age} yrs · {found.patient.gender} · <span className="font-mono text-brand-700">{found.patient.uhrId}</span></p><p className="text-xs text-slate-400">Identified via {found.method === 'qr' ? 'QR scan' : 'UHR ID'}</p></div>
              </div>
              <p className="mt-4 text-sm text-slate-600">Medical details stay hidden until you complete break-glass activation.</p>
              <Button variant="danger" size="lg" className="mt-4 w-full" icon={ArrowRight} onClick={() => setActivate(true)}>Break glass: continue</Button>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2" title="Your recent emergency sessions">
          {sessions.loading ? <p className="text-sm text-slate-500">Loading…</p> : !sessions.data?.sessions.length ? <EmptyState title="No emergency sessions yet" /> : (
            <ul className="divide-y divide-slate-100">
              {sessions.data.sessions.slice(0, 6).map((s) => (
                <li key={s._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium text-slate-900">{s.patientName}</p>{s.active ? <Badge tone="solidRed">Active</Badge> : <Badge tone="slate">Expired</Badge>}</div>
                  <p className="truncate text-xs text-slate-500">{fmtDateTime(s.startedAt)}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">“{s.reason}”</p>
                  {s.active && <Link to={`/emergency/${s._id}`} className="mt-1 inline-block text-sm font-medium text-red-700 hover:underline">Resume session →</Link>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <QrScanner open={scanner} onClose={() => setScanner(false)} onScan={onScan} />
      {activate && found && <ActivateModal target={found} onClose={() => setActivate(false)} />}
    </>
  );
}
