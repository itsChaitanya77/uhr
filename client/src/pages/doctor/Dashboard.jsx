import { Link } from 'react-router-dom';
import { CalendarDays, Pill, ScanLine, Search, Siren, Users, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../components/ui';
import { fmtTime, timeAgo } from '../../utils/format';

const ACTION_LABEL = {
  VIEW_PATIENT_RECORD: 'Viewed patient record',
  PATIENT_SEARCH: 'Searched patients',
  RECORD_CREATED: 'Added clinical entry',
  PRESCRIPTION_CREATED: 'Wrote prescription',
  PRESCRIPTION_UPDATED: 'Updated prescription',
  REPORT_UPLOADED: 'Uploaded report',
  EMERGENCY_ACCESS_ACTIVATED: 'Emergency access activated',
  EMERGENCY_LOOKUP: 'Emergency lookup',
  FILE_VIEWED: 'Opened report file',
  EMERGENCY_VIEW: 'Emergency dashboard viewed',
  EMERGENCY_ACCESS_ENDED: 'Emergency access ended',
  RECORD_UPDATED: 'Updated clinical entry',
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/doctor/overview');
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { stats, today, recentActivity } = data;

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.replace(/^Dr\.?\s*/i, 'Dr. ')}`}
        subtitle={`${user.specialty} · ${user.hospital || 'Lakeview General Hospital'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button as={Link} to="/doctor/search" variant="secondary" icon={Search}>
              Find Patient
            </Button>
            <Button as={Link} to="/doctor/emergency?scan=1" variant="danger" icon={ScanLine}>
              Scan Emergency QR
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Consented Patients" value={stats.assignedPatients} icon={Users} to="/doctor/search?q=" />
        <StatCard label="Today's Appointments" value={stats.todaysAppointments} icon={CalendarDays} tone="teal" to="/doctor/appointments" />
        <StatCard label="Pending Consultations" value={stats.pendingRequests} icon={Clock} tone="amber" to="/doctor/appointments" />
        <StatCard label="Prescriptions Issued" value={stats.prescriptionsWritten} icon={Pill} tone="slate" to="/doctor/prescriptions" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Today's Consultations */}
        <Card
          className="lg:col-span-3"
          title="Today's Consultations"
          subtitle="Pre-scheduled clinic slots"
          action={
            <Button as={Link} to="/doctor/appointments" size="sm" variant="ghost">
              All Consultations
            </Button>
          }
        >
          {today.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No consultations scheduled for today"
              message="Check pending appointments or lookup a consented patient."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {today.map((a) => (
                <li key={a._id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="w-16 shrink-0 rounded-xl bg-slate-100 py-1.5 text-center font-mono text-xs font-bold text-slate-800">
                    {fmtTime(a.scheduledAt)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{a.patient.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.reason}</p>
                  </div>
                  <Badge tone={a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'slate' : 'amber'}>
                    {a.status}
                  </Badge>
                  <Button as={Link} to={`/doctor/patients/${a.patient.id}`} size="sm" variant="secondary">
                    Open Chart
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Emergency Break Glass + Audit Stream */}
        <div className="space-y-6 lg:col-span-2">
          {/* Break Glass Action Prompt Card */}
          <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50/70 p-5 shadow-card">
            <div className="flex items-start gap-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
                <Siren className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-red-950 uppercase tracking-wide">Break-Glass Protocol</h2>
                  <span className="text-[10px] font-bold uppercase bg-red-600 text-white px-2 py-0.5 rounded-full">
                    30 Min Window
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-red-900/90">
                  Unresponsive or critically injured patient? Scan their physical emergency card or enter their UHR ID for audited access.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button as={Link} to="/doctor/emergency" variant="danger" size="sm" className="w-full">
                    Open Break-Glass Session
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Clinician Recent Activity */}
          <Card title="Recent Activity Trail" subtitle="Your audited actions">
            {recentActivity.length === 0 ? (
              <EmptyState title="No recent activity logged" />
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a._id} className="text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                    <p className="font-bold text-slate-800">{ACTION_LABEL[a.action] || a.action}</p>
                    <p className="truncate text-slate-500 mt-0.5">{a.details} · <span className="text-slate-400">{timeAgo(a.createdAt)}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
