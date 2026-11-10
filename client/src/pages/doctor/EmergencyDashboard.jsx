import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bell, Clock, FileText, FlaskConical, HeartPulse, LogOut, Phone, Pill, Scissors, ShieldAlert, Stethoscope } from 'lucide-react';
import api from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { LabDetailModal } from '../../components/records/RecordViews';
import { Button, Spinner } from '../../components/ui';
import { fmtDate, fmtDateTime } from '../../utils/format';

function useCountdown(expiresAt, serverNow) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const skew = serverNow ? new Date(serverNow).getTime() - Date.now() : 0; // tolerate client clock drift
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - (Date.now() + skew)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, serverNow]);
  return left;
}

const SEV_RANK = { 'life-threatening': 0, severe: 1, moderate: 2, mild: 3 };

function Panel({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/15 bg-slate-900 p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300"><Icon className="h-4 w-4" aria-hidden />{title}</h2>
      {children}
    </section>
  );
}

export default function EmergencyDashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error } = useApi(`/emergency/session/${sessionId}`);
  const [report, setReport] = useState(null);
  const [ending, setEnding] = useState(false);
  const left = useCountdown(data?.session.expiresAt, data?.session.serverNow);
  const expired = left === 0;

  const end = async () => {
    setEnding(true);
    try { await api.post(`/emergency/session/${sessionId}/end`); toast.success('Emergency session ended'); } catch { /* ignore */ }
    navigate('/doctor/emergency');
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950"><Spinner className="h-10 w-10 text-red-500" /></div>;

  if (error || expired) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-white">
        <div className="max-w-md"><Clock className="mx-auto h-14 w-14 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold">{expired || error?.status === 410 ? 'Emergency access expired' : 'Session unavailable'}</h1>
          <p className="mt-2 text-slate-300">{expired ? 'The time-limited window has closed and the data is no longer displayed.' : error.message}</p>
          <Button as={Link} to="/doctor/emergency" variant="danger" size="lg" className="mt-6">Back to emergency access</Button></div>
      </div>
    );
  }

  const { patient, session, criticalHistory, reports, contacts } = data;
  const allergies = [...patient.allergies].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  const critConditions = patient.conditions.filter((c) => c.critical);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const low = left < 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-red-700 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">Emergency mode · Demonstration with synthetic data</div>

      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6 text-red-500" /><span className="font-semibold">UHR Emergency Access</span></div>
        <div className="flex items-center gap-3">
          <div role="timer" aria-label="Time remaining" className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${low ? 'bg-red-600 pulse-ring' : 'bg-white/10'}`}>{mm}:{ss}</div>
          <Button variant="secondary" icon={LogOut} loading={ending} onClick={end}>End session</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8">
        {/* Identity + blood group */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="flex items-center gap-5 rounded-2xl border border-white/15 bg-slate-900 p-5 lg:col-span-2">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white text-4xl font-bold text-slate-900" aria-hidden>{patient.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
            <div className="min-w-0"><h1 className="text-3xl font-bold leading-tight sm:text-4xl">{patient.name}</h1>
              <p className="mt-1 text-lg text-slate-300">{patient.age} yrs · <span className="capitalize">{patient.gender}</span></p>
              <p className="mt-1 font-mono text-lg text-sky-300">{patient.uhrId}</p></div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-red-600 p-5 text-center" aria-label={`Blood group ${patient.bloodGroup}`}>
            <p className="text-sm font-bold uppercase tracking-widest text-red-100">Blood group</p>
            <p className="text-7xl font-extrabold leading-none sm:text-8xl">{patient.bloodGroup === 'Unknown' ? '?' : patient.bloodGroup}</p>
          </div>
        </section>

        {patient.criticalNotes && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-400/10 p-4 text-lg font-semibold text-amber-200"><AlertTriangle className="mt-1 h-6 w-6 shrink-0" />{patient.criticalNotes}</div>
        )}

        {/* Allergies: most prominent */}
        <section aria-label="Allergies" className="rounded-2xl border-4 border-red-500 bg-red-950 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold uppercase tracking-wider text-red-200"><AlertTriangle className="h-6 w-6" />Known allergies</h2>
          {allergies.length === 0 ? <p className="text-lg text-slate-200">No known allergies recorded (verify if possible).</p> : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allergies.map((a) => (
                <li key={a._id} className={`rounded-xl p-4 ${a.severity === 'life-threatening' || a.severity === 'severe' ? 'bg-red-600' : 'bg-white/10'}`}>
                  <p className="text-xl font-bold">{a.name}</p>
                  <p className="text-sm font-semibold uppercase tracking-wide text-red-100">{a.severity}</p>
                  {a.reaction && <p className="mt-1 text-slate-100">{a.reaction}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel icon={HeartPulse} title="Medical conditions">
            {patient.conditions.length === 0 ? <p className="text-slate-300">None recorded</p> : (
              <ul className="space-y-2">{[...critConditions, ...patient.conditions.filter((c) => !c.critical)].map((c) => (
                <li key={c._id} className={`rounded-lg p-3 ${c.critical ? 'border-l-4 border-amber-400 bg-amber-400/10' : 'bg-white/5'}`}>
                  <p className="text-lg font-semibold">{c.name} {c.critical && <span className="ml-1 rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold uppercase text-slate-900">Alert</span>}</p>
                  <p className="text-sm text-slate-300">{[c.since && `Since ${c.since}`, c.notes].filter(Boolean).join(' · ')}</p></li>))}</ul>)}
          </Panel>
          <Panel icon={Pill} title="Current medications">
            {patient.medications.length === 0 ? <p className="text-slate-300">None recorded</p> : (
              <ul className="space-y-2">{patient.medications.map((m) => {
                const blood = /warfarin|heparin|apixaban|rivaroxaban|clopidogrel/i.test(m.name);
                return (<li key={m._id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ${blood ? 'border-l-4 border-red-500 bg-red-500/10' : 'bg-white/5'}`}>
                  <span className="text-lg font-semibold">{m.name}</span><span className="text-slate-300">{[m.dose, m.frequency].filter(Boolean).join(' · ')}</span>
                  {blood && <span className="w-full text-sm font-bold uppercase text-red-300">Anticoagulant: bleeding risk</span>}</li>);
              })}</ul>)}
          </Panel>
          <Panel icon={Scissors} title="Previous surgeries">
            {patient.surgeries.length === 0 ? <p className="text-slate-300">None recorded</p> : <ul className="space-y-2">{patient.surgeries.map((s) => <li key={s._id} className="rounded-lg bg-white/5 p-3"><span className="font-semibold">{s.name}</span>{s.year && <span className="text-slate-300"> · {s.year}</span>}{s.notes && <p className="text-sm text-slate-300">{s.notes}</p>}</li>)}</ul>}
          </Panel>
          <Panel icon={Phone} title="Emergency contacts">
            {contacts.length === 0 ? <p className="text-slate-300">No contacts on file</p> : <ul className="space-y-2">{contacts.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"><div><p className="font-semibold">{c.name} {c.isPrimary && <span className="ml-1 rounded bg-sky-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">PRIMARY</span>}</p><p className="text-sm text-slate-300">{c.relation}</p></div>
                <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400">{c.phone}</a></li>))}</ul>}
          </Panel>
        </div>

        <Panel icon={Stethoscope} title="Critical medical history">
          {criticalHistory.length === 0 ? <p className="text-slate-300">No history entries on file</p> : (
            <ul className="grid gap-3 md:grid-cols-2">{criticalHistory.map((r) => (
              <li key={r.id} className={`rounded-lg p-3 ${r.critical ? 'border-l-4 border-red-500 bg-red-500/10' : 'bg-white/5'}`}>
                <p className="font-semibold">{r.title}</p><p className="text-xs text-slate-400">{fmtDate(r.date)} · {r.type}</p>
                {r.diagnosis && <p className="mt-1 text-sm text-slate-100"><b>Dx:</b> {r.diagnosis}</p>}{r.notes && <p className="mt-1 text-sm text-slate-300">{r.notes}</p>}</li>))}</ul>)}
        </Panel>

        <Panel icon={FlaskConical} title="Recent reports (quick access)">
          {reports.length === 0 ? <p className="text-slate-300">No reports on file</p> : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{reports.map((r) => {
              const abnormal = (r.results || []).filter((x) => x.flag !== 'normal').length;
              return (<li key={r._id}><button onClick={() => setReport(r)} className="flex h-full w-full items-start gap-3 rounded-lg bg-white/5 p-3 text-left transition-colors hover:bg-white/10">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" /><span><span className="block font-semibold">{r.title}</span><span className="block text-xs text-slate-400">{fmtDate(r.reportDate)} · {r.category}</span>{abnormal > 0 && <span className="mt-1 inline-block rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">{abnormal} abnormal</span>}</span></button></li>);
            })}</ul>)}
        </Panel>

        <footer className="flex flex-wrap items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p><b>Audit trail:</b> access by {session.notified.length ? '' : '(no contacts to notify) '}you, started {fmtDateTime(session.startedAt)}. Reason: “{session.reason}”.</p>
            {session.notified.length > 0 && <p className="mt-1">Notified (simulated): {session.notified.map((n) => `${n.name} (${n.relation})`).join(', ')} and the patient.</p>}</div>
        </footer>
      </main>
      <LabDetailModal report={report} onClose={() => setReport(null)} />
    </div>
  );
}
