import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, FileHeart, Fingerprint, QrCode, ScanLine, ScrollText, ShieldCheck, Siren, Stethoscope, Timer, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import Logo from '../components/layout/Logo';
import { Button } from '../components/ui';
import { useAuth, homePathFor } from '../context/AuthContext';

const CURRENT_YEAR = new Date().getFullYear();

const FEATURES = [
  { icon: FileHeart, title: 'One record, always yours', text: 'Consultations, prescriptions, lab tests and imaging gathered into a unified, encrypted vault you control.' },
  { icon: QrCode, title: 'Zero-Knowledge Emergency QR', text: 'Physical card with an opaque 192-bit token. No patient health info is ever readable on the QR itself.' },
  { icon: UserCheck, title: 'Granular Access Sovereignty', text: 'Grant or revoke permissions per-physician instantly. Full visibility over every clinician access event.' },
  { icon: ScrollText, title: 'Immutable Audit Trail', text: 'Every lookup, prescription, and emergency break-glass action is logged with IP, role, and timestamps.' },
];

const STEPS = [
  { icon: ScanLine, step: '01', title: 'Scan or Search', text: 'Emergency responders scan the physical card QR or query the unique UHR ID.' },
  { icon: Fingerprint, step: '02', title: 'Clinician Verification', text: 'Verified emergency doctor re-enters their password and provides a mandatory 15+ char clinical reason.' },
  { icon: Siren, step: '03', title: 'Break the Glass', text: 'A dedicated, high-contrast HUD displays life-critical data: blood group, severe allergies, and active medications.' },
  { icon: Timer, step: '04', title: 'Time-Limited & Audited', text: 'Strict 30-minute countdown session. Relatives and patients are alerted, and hospital admins review the case.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-700 px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Capstone Demonstration Platform · Instant Demo Accounts Available
        </span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-3" aria-label="Primary">
            <a href="#features" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 sm:block transition-colors">Features</a>
            <a href="#emergency" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 sm:block transition-colors">Emergency Protocol</a>
            <a href="#roles" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 sm:block transition-colors">User Portals</a>
            {user ? (
              <Button as={Link} to={homePathFor(user.role)} icon={ArrowRight}>Dashboard</Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button as={Link} to="/login" variant="ghost">Sign In</Button>
                <Button as={Link} to="/register">Create Account</Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 gradient-mesh">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/90 px-3.5 py-1 text-xs font-semibold text-brand-800 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              Smart Patient Sovereignty &amp; Emergency Access
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Your Complete Health History,{' '}
              <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent">
                Ready When Every Second Counts.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              UHR gives patients absolute control over their health records, enables seamless doctor-patient consultations with explicit consent, and equips verified clinicians with life-saving break-glass emergency access.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button as={Link} to="/register" size="lg" icon={ArrowRight}>
                Get Started as Patient
              </Button>
              <Button as={Link} to="/login" size="lg" variant="secondary">
                Launch Live Demo
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-y-2 gap-x-8 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> End-to-End Audited</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero-Knowledge QR Card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Dynamic Role-Based Access</span>
            </div>
          </div>

          {/* Interactive Hero Visual Preview */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer glow */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-brand-500 via-teal-500 to-indigo-500 opacity-20 blur-xl"></div>

              {/* Patient Card Preview */}
              <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-lg font-bold text-white shadow-md shadow-brand-500/25">
                      RD
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Rohan Das</h2>
                      <p className="font-mono text-xs font-semibold text-brand-600">UHR-1000003</p>
                      <p className="text-xs text-slate-500">25 yrs · Male · Kolkata</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 px-3.5 py-2 text-center text-white shadow-sm shadow-red-500/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-100">Blood</p>
                    <p className="text-2xl font-black leading-none">B+</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                      <Siren className="h-4 w-4 text-red-600" />
                      Critical Allergies
                    </div>
                    <p className="mt-1 text-sm font-semibold text-red-950">
                      Peanuts (Life-Threatening) · Latex (Severe)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <p className="text-[11px] font-medium text-slate-500">Chronic Condition</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">Epilepsy (Tonic-Clonic)</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <p className="text-[11px] font-medium text-slate-500">Active Medication</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">Levetiracetam (750mg)</p>
                    </div>
                  </div>
                </div>

                {/* Floating Emergency QR Callout */}
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-900 shadow-sm">
                      <QrCode className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Emergency Smart Token</p>
                      <p className="text-[11px] text-slate-500 font-mono">UHR-EMG:8f3c...9a12</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Enterprise Healthcare Architecture</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Designed for Trust, Privacy &amp; Clinical Speed</h2>
            <p className="mt-4 text-base text-slate-600">
              Modern patient data architecture combining zero-trust consent with instantaneous, safe clinician retrieval.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group relative rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:border-brand-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-200">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Break-Glass Protocol Deep-Dive */}
      <section id="emergency" className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-slate-950 to-slate-950" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
              <Siren className="h-4 w-4 animate-pulse text-red-500" />
              Break-Glass Emergency Engine
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Instant Access When Patients Cannot Speak
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              A military-grade fail-safe system ensuring treating physicians get life-saving answers in seconds while maintaining strict auditing.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, step, title, text }) => (
              <div key={title} className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-2xl font-black text-white/20">{step}</span>
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Showcase & Fast Demo Launch */}
      <section id="roles" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Tailored Workspaces</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Dedicated Portals for Every Stakeholder</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Patient Portal</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Download your physical emergency card, upload clinical documents, manage doctor access permissions, and schedule clinic appointments.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button as={Link} to="/login" variant="secondary" size="sm" className="w-full">
                  Sign In as Patient
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Doctor Portal</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Search patients by UHR ID, write synchronized e-prescriptions, review past lab files, and activate time-limited emergency access.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button as={Link} to="/login" variant="secondary" size="sm" className="w-full">
                  Sign In as Doctor
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Admin Portal</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Verify medical practitioner licenses, audit emergency break-glass sessions, investigate security access logs, and track platform metrics.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button as={Link} to="/login" variant="secondary" size="sm" className="w-full">
                  Sign In as Admin
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Demo CTA Banner */}
          <div className="mt-16 rounded-3xl bg-gradient-to-r from-brand-700 via-indigo-600 to-teal-600 p-8 sm:p-12 text-center text-white shadow-xl shadow-brand-600/20">
            <h2 className="text-2xl font-black sm:text-3xl">Ready to test the Universal Health Record?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100 text-sm sm:text-base">
              All demo credentials and synthetic patient profiles are pre-seeded and accessible with 1-click on the login screen.
            </p>
            <div className="mt-8 flex justify-center">
              <Button as={Link} to="/login" size="lg" variant="secondary" icon={ArrowRight}>
                Open Demo Account Switcher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <p>© {CURRENT_YEAR} Universal Health Record (UHR) · Capstone Demonstration Architecture. All data is synthetic.</p>
      </footer>
    </div>
  );
}
