import { Link } from 'react-router-dom';

export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1f5fd6" />
      <path d="M16 7.5v17M7.5 16h17" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="8" r="3" fill="#14b8a6" stroke="#1f5fd6" strokeWidth="1.5" />
    </svg>
  );
}

export default function Logo({ to = '/', light = false, compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Universal Health Record home">
      <LogoMark />
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        UHR<span className={`ml-1.5 whitespace-nowrap text-sm font-normal ${compact ? 'hidden' : 'hidden sm:inline'} ${light ? 'text-white/70' : 'text-slate-500'}`}>Universal Health Record</span>
      </span>
    </Link>
  );
}
