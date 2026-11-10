import { Link } from 'react-router-dom';
import { CalendarDays, Droplets, FileText, FlaskConical, Pill, QrCode, ShieldAlert, Stethoscope, Phone, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../components/ui';
import { ageFromDob, fmtDate, fmtDateTime, timeAgo } from '../../utils/format';

const ACTIVITY_ICON = { record: Stethoscope, prescription: Pill, lab: FlaskConical };

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/patient/overview');
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { patient, upcoming, activity, counts } = data;
  const missing = [];
  if (patient.bloodGroup === 'Unknown') missing.push('blood group');
  if (!counts.contacts) missing.push('an emergency contact');
  if (!patient.allergies.length) missing.push('allergies (or confirm none)');

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Here is your personal health vault and clinical status summary."
        actions={
          <Button as={Link} to="/patient/emergency" variant="secondary" icon={QrCode}>
            Emergency Card
          </Button>
        }
      />

      {missing.length > 0 && (
        <Alert tone="amber" title="Complete your emergency safety profile" className="mb-6">
          First responders &amp; treating doctors rely on this in life-threatening scenarios. Please add: <span className="font-semibold">{missing.join(', ')}</span>.
          <Link to="/patient/health" className="ml-2 font-bold underline hover:text-amber-950">
            Update Profile Now →
          </Link>
        </Alert>
      )}

      {/* Hero Overview Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient Identity Card */}
        <Card className="self-start lg:col-span-2 overflow-hidden" padded={false}>
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-teal-500 text-2xl font-black text-white shadow-md shadow-brand-500/25">
              {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{user.name}</h2>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  {patient.uhrId}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {ageFromDob(patient.dob)} years old · {patient.gender} · {patient.phone}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {patient.conditions.slice(0, 3).map((c) => (
                  <Badge key={c._id} tone={c.critical ? 'red' : 'slate'} className="font-medium">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white shadow-sm shadow-red-500/25 sm:flex-col sm:gap-0 sm:text-center sm:min-w-24">
              <Droplets className="h-5 w-5 text-rose-100" />
              <p className="text-2xl font-black leading-none mt-1">{patient.bloodGroup}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-100 mt-0.5">Blood Group</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3 text-xs">
            <span className="font-bold text-slate-700">Recorded Allergies:</span>
            {patient.allergies.length ? (
              patient.allergies.map((a) => (
                <Badge key={a._id} tone={a.severity === 'life-threatening' || a.severity === 'severe' ? 'red' : 'amber'}>
                  {a.name} ({a.severity})
                </Badge>
              ))
            ) : (
              <span className="text-slate-500">None currently documented</span>
            )}
          </div>
        </Card>

        {/* Emergency Card Quick Action */}
        <Card
          title="Emergency Break-Glass QR"
          subtitle="Physical safety identifier"
          action={<QrCode className="h-5 w-5 text-slate-400" />}
        >
          <p className="text-xs leading-relaxed text-slate-600">
            Contains an encrypted 192-bit opaque token. Emergency clinicians scan this to trigger audited emergency access.
          </p>
          <Button as={Link} to="/patient/emergency" variant="primary" className="mt-4 w-full" icon={QrCode}>
            Download Emergency Card
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {counts.contacts} registered emergency contact{counts.contacts === 1 ? '' : 's'}
          </p>
        </Card>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clinical Records" value={counts.records} icon={FileText} to="/patient/records" />
        <StatCard label="Active Prescriptions" value={counts.activePrescriptions} icon={Pill} tone="teal" to="/patient/records" />
        <StatCard label="Lab & Diagnostic Reports" value={counts.labReports} icon={FlaskConical} tone="amber" to="/patient/records" />
        <StatCard label="Break-Glass Audits" value={counts.emergencyAccessEvents} icon={ShieldAlert} tone={counts.emergencyAccessEvents ? 'red' : 'slate'} to="/patient/access" hint="View access logs" />
      </div>

      {/* Upcoming & Recent Activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title="Upcoming Consultations"
          action={
            <Button as={Link} to="/patient/appointments" variant="ghost" size="sm">
              Schedule New
            </Button>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No consultations scheduled"
              message="Book a session during clinic hours (Mon–Sat 09:00–17:00 IST)."
              action={<Button as={Link} to="/patient/appointments" size="sm">Book Appointment</Button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a._id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="w-14 shrink-0 rounded-xl bg-brand-50 py-2 text-center text-brand-800 ring-1 ring-brand-200/50">
                    <p className="text-[10px] font-bold uppercase">{fmtDate(a.scheduledAt, { month: 'short' })}</p>
                    <p className="text-lg font-black leading-tight">{new Date(a.scheduledAt).getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{a.doctor?.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.reason}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDateTime(a.scheduledAt)}</p>
                  </div>
                  <Badge tone={a.status === 'confirmed' ? 'green' : 'amber'}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent Clinical Activity"
          action={
            <Button as={Link} to="/patient/records" variant="ghost" size="sm">
              View All Records
            </Button>
          }
        >
          {activity.length === 0 ? (
            <EmptyState title="No clinical history recorded yet" />
          ) : (
            <ul className="space-y-3.5">
              {activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind] || Stethoscope;
                return (
                  <li key={`${a.kind}-${a.id}`} className="flex items-center gap-3.5 rounded-xl p-2 hover:bg-slate-50 transition-colors">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{a.title}</p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {a.subtitle} · {timeAgo(a.date)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
