import { Activity, CalendarDays, ClipboardList, FileText, HeartPulse, LayoutDashboard, Pill, QrCode, ScrollText, Search, ShieldCheck, Siren, Stethoscope, Users, Settings, UserRound } from 'lucide-react';

export const NAV = {
  patient: [
    { to: '/patient', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/patient/records', label: 'Medical records', icon: FileText },
    { to: '/patient/health', label: 'Health profile', icon: HeartPulse },
    { to: '/patient/emergency', label: 'Emergency QR', icon: QrCode },
    { to: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/patient/access', label: 'Privacy & access', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/doctor/search', label: 'Patient search', icon: Search },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
    { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/doctor/emergency', label: 'Emergency access', icon: Siren, emergency: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: Activity, end: true },
    { to: '/admin/users', label: 'User management', icon: Users },
    { to: '/admin/audit', label: 'Audit logs', icon: ScrollText },
    { to: '/admin/emergency', label: 'Emergency review', icon: Siren, emergency: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
};

export const SEARCH_TARGET = {
  patient: { to: '/patient/records', placeholder: 'Search your records…' },
  doctor: { to: '/doctor/search', placeholder: 'Search patient name or UHR ID…' },
  admin: { to: '/admin/users', placeholder: 'Search users…' },
};

export const ROLE_LABEL = { patient: 'Patient', doctor: 'Doctor', admin: 'Administrator' };
export { ClipboardList, Stethoscope, UserRound };
