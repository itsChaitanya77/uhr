import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';
import { Alert, Button, Input, Select } from '../components/ui';
import Logo from '../components/layout/Logo';

const BLOOD = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TODAY_ISO = new Date().toISOString().slice(0, 10);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', dob: '', gender: '', bloodGroup: 'Unknown', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const validate = () => {
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email';
    if (!f.phone.trim()) errs.phone = 'Phone number is required';
    if (!f.dob) errs.dob = 'Date of birth is required';
    else if (new Date(f.dob) > new Date()) errs.dob = 'Date of birth must be in the past';
    if (!f.gender) errs.gender = 'Select a gender';
    if (f.password.length < 8) errs.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(f.password) || !/[a-z]/.test(f.password) || !/\d/.test(f.password)) {
      errs.password = 'Include uppercase, lowercase and a number';
    }
    if (f.password !== f.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setLoading(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), dob: f.dob, gender: f.gender, bloodGroup: f.bloodGroup, password: f.password });
      navigate('/patient', { replace: true });
    } catch (err) {
      const parsed = apiError(err);
      setErrors({ _form: parsed.message, ...parsed.fieldErrors });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-12 bg-slate-50">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <div className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-7 shadow-card sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create Patient Medical Vault</h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Register your digital Universal Health Record. You will receive a unique UHR ID and a zero-knowledge physical emergency QR token.
          </p>
          <form onSubmit={submit} noValidate className="mt-8 grid gap-4 sm:grid-cols-2">
            {errors._form && <Alert tone="red" className="sm:col-span-2">{errors._form}</Alert>}
            <Input className="sm:col-span-2" label="Full name" required value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" placeholder="First and last name" />
            <Input label="Email address" type="email" required value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="name@example.com" />
            <Input label="Phone number" type="tel" required value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" placeholder="+91 98765 43210" />
            <Input label="Date of birth" type="date" required value={f.dob} onChange={set('dob')} error={errors.dob} max={TODAY_ISO} />
            <Select label="Gender" required value={f.gender} onChange={set('gender')} error={errors.gender}>
              <option value="">Select gender…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </Select>
            <Select label="Blood group" value={f.bloodGroup} onChange={set('bloodGroup')} hint="Can be confirmed or modified later.">{BLOOD.map((b) => <option key={b}>{b}</option>)}</Select>
            <div />
            <Input label="Password" type="password" required value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="8+ characters, upper & lower case, number." />
            <Input label="Confirm password" type="password" required value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
            <Button type="submit" size="lg" className="sm:col-span-2 mt-2" loading={loading}>Create Account &amp; Vault</Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">Sign in here</Link></p>
      </div>
    </div>
  );
}
