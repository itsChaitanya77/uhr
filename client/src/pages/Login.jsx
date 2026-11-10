import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, FlaskConical, MousePointerClick, ShieldCheck, Stethoscope, User, Check } from 'lucide-react';
import { useAuth, homePathFor } from '../context/AuthContext';
import { apiError } from '../api/client';
import { Alert, Badge, Button, Input } from '../components/ui';
import Logo from '../components/layout/Logo';

const DEMO = [
  {
    group: 'Patients',
    icon: User,
    password: 'Patient@123',
    tone: 'blue',
    description: 'Explore the patient vault, emergency card & consent management',
    rows: [
      ['aarav@uhr.demo', 'Aarav Mehta', 'O+ · Diabetic (Insulin) · Severe Penicillin Allergy'],
      ['priya@uhr.demo', 'Priya Iyer', 'A− · Severe Asthma · NSAID Allergy'],
      ['rohan@uhr.demo', 'Rohan Das', 'B+ · Epilepsy · Peanut/Latex (Adrenaline auto-injector)'],
      ['meera@uhr.demo', 'Meera Kapoor', 'AB+ · Pregnancy (28w) · Contrast media allergy'],
      ['karthik@uhr.demo', 'Karthik Reddy', 'O− · Warfarin Anticoagulation · Cardiac Stent'],
    ]
  },
  {
    group: 'Doctors',
    icon: Stethoscope,
    password: 'Doctor@123',
    tone: 'teal',
    description: 'Diagnose, prescribe, search patients, or test Emergency Break-Glass',
    rows: [
      ['dr.sharma@uhr.demo', 'Dr. Vikram Sharma', 'Emergency Medicine · Verified · Emergency Permitted'],
      ['dr.patel@uhr.demo', 'Dr. Neha Patel', 'Cardiology · Verified · Prescribing Permitted'],
      ['dr.nair@uhr.demo', 'Dr. Arjun Nair', 'Endocrinology · License Awaiting Admin Verification'],
    ]
  },
  {
    group: 'Administrator',
    icon: ShieldCheck,
    password: 'Admin@123',
    tone: 'slate',
    description: 'Verify physician licenses, audit break-glass incidents & review logs',
    rows: [
      ['admin@uhr.demo', 'Ananya Rao', 'Full System Governance · Audit Logs & Verification']
    ]
  },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Patients');
  const [selectedEmail, setSelectedEmail] = useState('');

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFieldErrors({});
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Enter your password';
    if (Object.keys(errs).length) return setFieldErrors(errs);
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from || homePathFor(u.role), { replace: true });
    } catch (err) {
      const parsed = apiError(err);
      setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setLoading(false); }
  };

  const handleSelectDemo = (email, password) => {
    setForm({ email, password });
    setSelectedEmail(email);
    setFieldErrors({});
    setError('');
  };

  const currentDemoGroup = DEMO.find(d => d.group === activeTab) || DEMO[0];

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-slate-50">
      {/* Left Column: Sign In Form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-5 lg:px-16 xl:col-span-5 bg-white border-r border-slate-200/80">
        <div className="mx-auto w-full max-w-sm sm:max-w-md">
          <Logo />
          
          <div className="mt-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign In to UHR</h1>
            <p className="mt-2 text-sm text-slate-500">
              Access your medical vault, clinical schedule, or hospital management portal.
            </p>
          </div>

          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            {error && <Alert tone="red">{error}</Alert>}

            <Input
              label="Email Address"
              type="email"
              autoComplete="username"
              value={form.email}
              error={fieldErrors.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                error={fieldErrors.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Sign In
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Need a new patient account?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 underline">
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column: Demo Account Quick-Picker */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-7 lg:px-16 xl:col-span-7 bg-slate-50">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Instant Demo Accounts</h2>
                <p className="text-xs text-slate-500">Pre-seeded with realistic synthetic clinical histories</p>
              </div>
            </div>
            <Badge tone="teal">1-Click Auto-Fill</Badge>
          </div>

          {/* Group Filter Tabs */}
          <div className="mt-6 flex gap-2 rounded-2xl bg-slate-200/60 p-1.5">
            {DEMO.map((group) => {
              const Icon = group.icon;
              const isActive = activeTab === group.group;
              return (
                <button
                  key={group.group}
                  type="button"
                  onClick={() => setActiveTab(group.group)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {group.group}
                </button>
              );
            })}
          </div>

          {/* Demo Cards for Active Tab */}
          <div className="mt-4 space-y-2.5">
            <p className="text-xs text-slate-500 flex items-center justify-between px-1">
              <span>{currentDemoGroup.description}</span>
              <span className="font-mono text-slate-400 text-[11px]">Pass: {currentDemoGroup.password}</span>
            </p>

            {currentDemoGroup.rows.map(([email, name, note]) => {
              const isSelected = selectedEmail === email;
              return (
                <button
                  key={email}
                  type="button"
                  onClick={() => handleSelectDemo(email, currentDemoGroup.password)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-500/20'
                      : 'border-slate-200/90 bg-white hover:border-brand-300 hover:bg-slate-50/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{name}</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-bold">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1">{note}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs text-brand-700 font-medium block">
                        {email}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                        <MousePointerClick className="h-3 w-3" /> Auto-fill
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Break Glass Demo Callout */}
          <div className="mt-6 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-600 text-white text-xs font-bold">
                TIP
              </div>
              <div>
                <p className="text-xs font-bold text-red-950 uppercase tracking-wide">Break-Glass Testing Recommendation</p>
                <p className="mt-1 text-xs text-red-900 leading-relaxed">
                  Log in as <b>Dr. Vikram Sharma</b>, head to <b>Emergency Access</b>, and search for <span className="font-mono font-bold">UHR-1000003</span> (Rohan Das). He has granted zero non-emergency permissions, allowing you to experience the fully audited 30-minute break-glass emergency countdown!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
