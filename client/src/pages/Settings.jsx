import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAction } from '../hooks/useApi';
import api from '../api/client';
import { Badge, Button, Card, Input, PageHeader } from '../components/ui';
import { ROLE_LABEL } from '../components/layout/navConfig';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const profile = useAction(toast);
  const pw = useAction(toast);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    const data = await profile.run(() => api.put('/auth/me', form.phone ? form : { name: form.name }), 'Profile updated');
    if (data) setUser(data.user);
  };
  const savePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) return setPwError('New passwords do not match');
    const ok = await pw.run(() => api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }), 'Password changed');
    if (ok) setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account and security." crumbs={[{ label: 'Home', to: `/${user.role}` }, { label: 'Settings' }]} />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card title="Profile" subtitle="Your name and contact details">
          <form onSubmit={saveProfile} className="space-y-4">
            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={profile.fieldErrors.name} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={profile.fieldErrors.phone} />
            <Input label="Email" value={user.email} disabled hint="Email can't be changed in this demo." />
            <div className="flex items-center gap-2 text-sm text-slate-600">Role <Badge tone="blue">{ROLE_LABEL[user.role]}</Badge>{user.uhrId && <Badge tone="slate" className="font-mono">{user.uhrId}</Badge>}</div>
            <Button type="submit" loading={profile.saving}>Save changes</Button>
          </form>
        </Card>
        <Card title="Change password" subtitle="Use a strong, unique password">
          <form onSubmit={savePassword} className="space-y-4">
            <Input label="Current password" type="password" autoComplete="current-password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} error={pw.fieldErrors.currentPassword} required />
            <Input label="New password" type="password" autoComplete="new-password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} error={pw.fieldErrors.newPassword} hint="8+ characters, upper & lower case, a number." required />
            <Input label="Confirm new password" type="password" autoComplete="new-password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} error={pwError} required />
            <Button type="submit" loading={pw.saving}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
