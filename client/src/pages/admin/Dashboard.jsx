import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileText, ShieldCheck, Siren, Stethoscope, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../components/ui';
import { fmtDate, timeAgo } from '../../utils/format';

const COLORS = ['#1f5fd6', '#14b8a6', '#f59e0b'];
const shortDay = (d) => fmtDate(d, { day: 'numeric', month: 'short' });
const axis = { fontSize: 12, fill: '#64748b' };
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 } };

export default function AdminDashboard() {
  const { data, loading, error, reload } = useApi('/admin/stats');
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { totals, recordsBreakdown, emergencyByDay, activityByDay, emergencyByDoctor, recentActivity } = data;
  const emergencyTotal14 = emergencyByDay.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <PageHeader title="Administration" subtitle="System overview and activity monitoring." />
      {totals.pendingDoctors > 0 && <Alert tone="amber" title="Doctors awaiting verification" className="mb-4">{totals.pendingDoctors} doctor account{totals.pendingDoctors > 1 ? 's need' : ' needs'} credential verification. <Link to="/admin/users?role=doctor" className="font-semibold underline">Review now</Link></Alert>}
      {totals.pendingReview > 0 && <Alert tone="red" icon={Siren} title="Emergency accesses to review" className="mb-4">{totals.pendingReview} break-glass event{totals.pendingReview > 1 ? 's are' : ' is'} awaiting review. <Link to="/admin/emergency" className="font-semibold underline">Open review queue</Link></Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered patients" value={totals.patients} icon={Users} to="/admin/users?role=patient" />
        <StatCard label="Verified doctors" value={`${totals.verifiedDoctors} / ${totals.doctors}`} icon={Stethoscope} tone="teal" to="/admin/users?role=doctor" />
        <StatCard label="Medical records" value={totals.records} icon={FileText} tone="slate" hint="Notes, Rx, reports" />
        <StatCard label="Emergency accesses" value={totals.emergencyAccess} icon={Siren} tone="red" to="/admin/emergency" hint={`${totals.activeEmergencySessions} active now`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="System activity" subtitle="Audit events, last 14 days">
          <div className="h-64" role="img" aria-label="Area chart of audit events per day">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityByDay} margin={{ left: -20, right: 8, top: 8 }}>
                <defs><linearGradient id="act" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f5fd6" stopOpacity={0.3} /><stop offset="100%" stopColor="#1f5fd6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDay} tick={axis} tickLine={false} axisLine={false} interval={1} />
                <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip {...tip} labelFormatter={shortDay} formatter={(v) => [v, 'Events']} />
                <Area type="monotone" dataKey="count" stroke="#1f5fd6" strokeWidth={2} fill="url(#act)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Records by type">
          <div className="h-52" role="img" aria-label="Donut chart of records by type">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={recordsBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3}>{recordsBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % 3]} />)}</Pie><Tooltip {...tip} /></PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">{recordsBreakdown.map((r, i) => <li key={r.name} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % 3] }} />{r.name}</span><span className="font-medium tabular-nums">{r.value}</span></li>)}</ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Emergency access statistics" subtitle={`${emergencyTotal14} break-glass event${emergencyTotal14 === 1 ? '' : 's'} in the last 14 days`} action={<Button as={Link} to="/admin/emergency" variant="secondary" size="sm">Review</Button>}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-56 md:col-span-2" role="img" aria-label="Bar chart of emergency accesses per day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emergencyByDay} margin={{ left: -24, right: 4, top: 8 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDay} tick={axis} tickLine={false} axisLine={false} interval={2} />
                  <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} labelFormatter={shortDay} formatter={(v) => [v, 'Emergency accesses']} />
                  <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">By doctor</p>
              {emergencyByDoctor.length === 0 ? <p className="text-sm text-slate-500">No events</p> : <ul className="space-y-2">{emergencyByDoctor.map((d) => <li key={d.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="truncate">{d.name}</span><span className="font-semibold tabular-nums">{d.count}</span></li>)}</ul>}</div>
          </div>
        </Card>
        <Card title="Latest audit events" action={<Button as={Link} to="/admin/audit" variant="ghost" size="sm">All logs</Button>}>
          {recentActivity.length === 0 ? <EmptyState icon={ShieldCheck} title="No events" /> : <ul className="space-y-3">{recentActivity.map((a) => <li key={a._id} className="text-sm"><p className="font-medium text-slate-800">{a.action.replaceAll('_', ' ').toLowerCase()}</p><p className="truncate text-xs text-slate-500">{a.actorName} · {timeAgo(a.createdAt)}</p></li>)}</ul>}
        </Card>
      </div>
    </>
  );
}
