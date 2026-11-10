import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Ban, Plus, RotateCcw, Search, Users } from 'lucide-react';
import api from '../../api/client';
import { useApi, useAction } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Avatar, Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>{label}
    </label>
  );
}

function CreateDoctorModal({ onClose, onDone }) {
  const toast = useToast();
  const { run, saving, fieldErrors } = useAction(toast);
  const [f, setF] = useState({ name: '', email: '', password: '', licenseNumber: '', specialty: '', hospital: '' });
  const [errs, setErrs] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (f.name.trim().length < 2) e2.name = 'Enter a name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e2.email = 'Enter a valid email';
    if (f.licenseNumber.trim().length < 4) e2.licenseNumber = 'Enter the license number';
    if (f.specialty.trim().length < 2) e2.specialty = 'Enter a specialty';
    if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password)) e2.password = '8+ characters with upper, lower case and a number';
    setErrs(e2);
    if (Object.keys(e2).length) return;
    if (await run(() => api.post('/admin/doctors', f), 'Doctor account created (pending verification)')) { onDone(); onClose(); }
  };
  const err = (k) => errs[k] || fieldErrors[k];
  return (
    <Modal open onClose={onClose} title="Create doctor account" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Create account</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err('name')} placeholder="Dr. Jane Doe" />
        <Input label="Email" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err('email')} />
        <Input label="License number" required value={f.licenseNumber} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })} error={err('licenseNumber')} />
        <Input label="Specialty" required value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} error={err('specialty')} />
        <Input className="sm:col-span-2" label="Hospital / clinic" value={f.hospital} onChange={(e) => setF({ ...f, hospital: e.target.value })} />
        <Input className="sm:col-span-2" label="Temporary password" required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err('password')} />
      </form>
    </Modal>
  );
}

export default function UserManagement() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [confirm, setConfirm] = useState(null);
  const [creating, setCreating] = useState(false);
  const act = useAction(toast);
  useEffect(() => setInput(q), [q]);

  const qs = new URLSearchParams({ ...(role && { role }), ...(q && { q }) }).toString();
  const { data, loading, error, reload } = useApi(`/admin/users?${qs}`);
  const setParam = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n); };

  const doStatus = async () => {
    const next = confirm.user.status === 'active' ? 'suspended' : 'active';
    if (await act.run(() => api.put(`/admin/users/${confirm.user._id}/status`, { status: next }), `Account ${next === 'active' ? 'reactivated' : 'suspended'}`)) { setConfirm(null); reload(); }
  };
  const verify = async (u, verified) => { if (await act.run(() => api.put(`/admin/doctors/${u.doctor.id}/verify`, { verified }), verified ? `${u.name} verified` : 'Verification revoked')) reload(); };
  const perm = async (u, patch) => { if (await act.run(() => api.put(`/admin/doctors/${u.doctor.id}/permissions`, patch), 'Permissions updated')) reload(); };

  const columns = [
    { header: 'User', render: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} size="sm" tone={u.role === 'doctor' ? 'teal' : u.role === 'admin' ? 'slate' : 'blue'} /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{u.name}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div></div> },
    { header: 'Role', render: (u) => <div><Badge tone={u.role === 'doctor' ? 'teal' : u.role === 'admin' ? 'slate' : 'blue'}>{u.role}</Badge>{u.uhrId && <p className="mt-1 font-mono text-xs text-slate-500">{u.uhrId}</p>}</div> },
    { header: 'Details', render: (u) => u.doctor ? (
      <div className="space-y-1.5"><p className="text-sm">{u.doctor.specialty}</p><p className="font-mono text-xs text-slate-500">{u.doctor.licenseNumber}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1"><Toggle label="Can prescribe" checked={u.doctor.permissions?.prescribe !== false} onChange={(v) => perm(u, { prescribe: v })} disabled={act.saving} /><Toggle label="Emergency access" checked={u.doctor.permissions?.emergencyAccess !== false} onChange={(v) => perm(u, { emergencyAccess: v })} disabled={act.saving} /></div></div>
    ) : <span className="text-sm text-slate-500">Joined {fmtDate(u.createdAt)}</span> },
    { header: 'Status', render: (u) => <div className="space-y-1"><Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>{u.doctor && <div><Badge tone={u.doctor.verified ? 'teal' : 'amber'}>{u.doctor.verified ? 'verified' : 'unverified'}</Badge></div>}</div> },
    { header: '', className: 'text-right', render: (u) => (
      <div className="flex flex-wrap justify-end gap-1">
        {u.doctor && !u.doctor.verified && <Button size="sm" variant="teal" icon={BadgeCheck} onClick={() => verify(u, true)}>Verify</Button>}
        {u.doctor?.verified && <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'unverify', user: u })}>Revoke</Button>}
        {u.role !== 'admin' && (u.status === 'active' ? <Button size="sm" variant="dangerGhost" icon={Ban} onClick={() => setConfirm({ kind: 'status', user: u })}>Suspend</Button> : <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setConfirm({ kind: 'status', user: u })}>Reactivate</Button>)}
      </div>) },
  ];

  return (
    <>
      <PageHeader title="User management" subtitle="Manage accounts, verify doctors and control permissions." crumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Users' }]} actions={<Button icon={Plus} onClick={() => setCreating(true)}>Create doctor</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setParam('q', input.trim()); }} className="relative min-w-60 flex-1 sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search users" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search name or email…" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </form>
        <Select aria-label="Filter by role" value={role} onChange={(e) => setParam('role', e.target.value)} className="w-44"><option value="">All roles</option><option value="patient">Patients</option><option value="doctor">Doctors</option><option value="admin">Admins</option></Select>
      </div>
      <Card padded={false}>
        {loading && !data ? <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div> : error ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <DataTable rowKey="_id" columns={columns} rows={data.users} empty={<EmptyState icon={Users} title="No users match" message="Adjust the search or filters." />} />
        )}
      </Card>
      {creating && <CreateDoctorModal onClose={() => setCreating(false)} onDone={reload} />}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} loading={act.saving} danger={confirm?.kind === 'unverify' || confirm?.user.status === 'active'}
        title={confirm?.kind === 'unverify' ? 'Revoke verification?' : confirm?.user.status === 'active' ? 'Suspend this account?' : 'Reactivate this account?'}
        confirmLabel={confirm?.kind === 'unverify' ? 'Revoke' : confirm?.user.status === 'active' ? 'Suspend' : 'Reactivate'}
        message={confirm?.kind === 'unverify' ? `${confirm?.user.name} will lose access to patient records and emergency access until verified again.` : confirm?.user.status === 'active' ? `${confirm?.user.name} will be signed out and unable to log in.` : `${confirm?.user.name} will be able to sign in again.`}
        onConfirm={() => (confirm.kind === 'unverify' ? act.run(() => api.put(`/admin/doctors/${confirm.user.doctor.id}/verify`, { verified: false }), 'Verification revoked').then((ok) => { if (ok) { setConfirm(null); reload(); } }) : doStatus())} />
    </>
  );
}
