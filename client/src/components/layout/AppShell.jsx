import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Clock, LogOut, Menu, Search, Settings, X } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { NAV, ROLE_LABEL, SEARCH_TARGET } from './navConfig';
import Logo from './Logo';
import { Avatar } from '../ui';
import { timeAgo } from '../../utils/format';

function Sidebar({ items, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-4">
      {items.map(({ to, label, icon: Icon, end, emergency }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-tight transition-all duration-150 ${
              isActive
                ? emergency
                  ? 'bg-rose-50 text-rose-700 font-bold shadow-xs ring-1 ring-rose-200/60'
                  : 'bg-brand-50 text-brand-700 font-bold shadow-xs ring-1 ring-brand-200/60'
                : emergency
                ? 'text-rose-600 hover:bg-rose-50/80 hover:text-rose-700'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`
          }
        >
          <Icon className="h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105" aria-hidden />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function useOutsideClose(ref, close) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && close();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));

  const load = () => api.get('/notifications').then((r) => setState(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && state.unread) {
      await api.put('/notifications/read-all').catch(() => {});
      setTimeout(load, 1500);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label={`Notifications${state.unread ? `, ${state.unread} unread` : ''}`}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100/80 transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {state.unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {state.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white shadow-pop overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Notifications</p>
            {state.unread > 0 && <span className="text-[11px] font-semibold text-brand-600">{state.unread} new</span>}
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {state.notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-slate-500">You're all caught up.</li>
            )}
            {state.notifications.map((n) => (
              <li key={n._id} className={`px-4 py-3 transition-colors ${n.type === 'emergency' ? 'bg-red-50/70' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-bold ${n.type === 'emergency' ? 'text-red-900' : 'text-slate-900'}`}>{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" aria-label="unread" />}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">{timeAgo(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2.5 hover:bg-slate-100/80 transition-colors cursor-pointer"
      >
        <Avatar name={user.name} size="sm" tone={user.role === 'doctor' ? 'teal' : user.role === 'admin' ? 'slate' : 'blue'} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-xs font-bold text-slate-900">{user.name}</span>
          <span className="block text-[11px] text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-pop">
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50 rounded-xl mb-1">
            <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
            {user.uhrId && <p className="mt-1 font-mono text-[11px] font-bold text-brand-600">{user.uhrId}</p>}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Account Settings
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function PendingVerification() {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-amber-200/90 bg-amber-50/80 p-8 text-center shadow-card">
      <Clock className="mx-auto h-12 w-12 text-amber-600 animate-pulse" />
      <h1 className="mt-4 text-xl font-bold text-amber-950">Credentials Awaiting Verification</h1>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">
        An administrator must verify your medical registration license before you can view patient histories or invoke emergency break-glass sessions.
      </p>
      <div className="mt-5 rounded-2xl bg-white/70 p-3 text-xs text-amber-950 font-medium">
        Tip for demo: Log in as <span className="font-bold">admin@uhr.demo</span> to verify this account in 1 click!
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const items = NAV[user.role];
  const target = SEARCH_TARGET[user.role];
  const blocked = user.role === 'doctor' && !user.verified && location.pathname !== '/settings';

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (target?.to) {
      navigate(`${target.to}?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="min-h-screen lg:pl-64 bg-slate-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>

      {/* Desktop Persistent Sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Logo to={`/${user.role}`} compact />
        </div>

        <Sidebar items={items} />

        {/* Bottom Status Card */}
        <div className="m-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-indigo-50/50 p-3.5 text-xs text-brand-900">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>UHR Live Demo</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Synthetic sandbox environment. All interactions are audited.
          </p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <Logo to={`/${user.role}`} />
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-xl p-1.5 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar items={items} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      {/* Top Navbar */}
      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md lg:px-8">
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {target && (
          <form onSubmit={submitSearch} role="search" className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search"
              placeholder={target.placeholder}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9.5 pr-3 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          <NotificationMenu />
          <ProfileMenu />
        </div>
      </header>

      {/* Main Page Canvas */}
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {blocked ? <PendingVerification /> : <Outlet />}
      </main>
    </div>
  );
}
