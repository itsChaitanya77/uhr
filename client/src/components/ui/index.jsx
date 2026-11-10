import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { initials } from '../../utils/format';

/* ---------- Button ---------- */
const BUTTON_VARIANTS = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600 shadow-sm shadow-brand-500/25',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50/80 hover:text-slate-900 shadow-xs',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-sm shadow-red-500/25',
  teal: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-500 hover:to-emerald-500 shadow-sm shadow-teal-500/25',
  dangerGhost: 'text-red-700 hover:bg-red-50',
};
const BUTTON_SIZES = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base' };

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, as: As = 'button', className = '', children, disabled, ...rest }) {
  const props = As === 'button' ? { type: 'button', disabled: disabled || loading, ...rest } : { ...rest };
  return (
    <As className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </As>
  );
}

/* ---------- Card / StatCard / Badge ---------- */
export function Card({ title, subtitle, action, children, className = '', padded = true }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-card transition-shadow hover:shadow-md ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100/80 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-200/80',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200/80',
  red: 'bg-rose-50 text-rose-700 ring-rose-200/80',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  solidRed: 'bg-red-600 text-white ring-red-700',
};
export function Badge({ tone = 'slate', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>{children}</span>;
}

const ICON_GRADIENTS = {
  blue: 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-sm shadow-brand-500/30',
  teal: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/30',
  red: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/30',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/30',
  green: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30',
  slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm shadow-slate-500/30',
};

export function StatCard({ label, value, icon: Icon, tone = 'blue', hint, to }) {
  const body = (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${ICON_GRADIENTS[tone] || ICON_GRADIENTS.blue}`}>
          {Icon && <Icon className="h-6 w-6" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value ?? '—'}</p>
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

/* ---------- Form fields ---------- */
const inputBase = 'block w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all disabled:bg-slate-50 disabled:text-slate-400';

export function Field({ label, error, hint, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>}
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
export function Input({ label, error, hint, required, className = '', id, ...rest }) {
  const fid = id || `f-${(label || rest.name || '').toString().replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={className}>
      <input id={fid} aria-invalid={Boolean(error)} className={`${inputBase} h-10 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'}`} {...rest} />
    </Field>
  );
}
export function Select({ label, error, hint, required, className = '', id, children, ...rest }) {
  const fid = id || `f-${(label || rest.name || '').toString().replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={className}>
      <select id={fid} aria-invalid={Boolean(error)} className={`${inputBase} h-10 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'}`} {...rest}>{children}</select>
    </Field>
  );
}
export function Textarea({ label, error, hint, required, className = '', id, rows = 3, ...rest }) {
  const fid = id || `f-${(label || rest.name || '').toString().replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={className}>
      <textarea id={fid} rows={rows} aria-invalid={Boolean(error)} className={`${inputBase} py-2.5 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'}`} {...rest} />
    </Field>
  );
}

/* ---------- Modal + confirm ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md', tone = 'default' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full ${width} flex-col rounded-t-2xl border border-slate-100 bg-white shadow-2xl outline-none sm:rounded-2xl`}>
        <header className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${tone === 'danger' ? 'border-red-100 bg-red-50 rounded-t-2xl' : 'border-slate-100'}`}>
          <h2 className={`text-base font-semibold ${tone === 'danger' ? 'text-red-800' : 'text-slate-900'}`}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 rounded-b-2xl">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" tone={danger ? 'danger' : 'default'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm leading-6 text-slate-600">{message}</p>
    </Modal>
  );
}

/* ---------- Feedback ---------- */
export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={`skeleton ${className}`} aria-hidden />;

export function PageSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon className="h-6 w-6" /></div>
      <p className="font-semibold text-slate-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <p className="mt-2 font-medium text-red-800">{error?.message || 'Something went wrong'}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Alert({ tone = 'blue', title, children, icon: Icon = AlertTriangle, className = '' }) {
  const styles = {
    blue: 'border-brand-200 bg-brand-50/80 text-brand-900',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-900',
    red: 'border-rose-200 bg-rose-50/80 text-rose-900',
    green: 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
  };
  return (
    <div role={tone === 'red' ? 'alert' : 'note'} className={`flex gap-3 rounded-2xl border p-4 text-sm ${styles[tone]} ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>{title && <p className="font-semibold">{title}</p>}<div className={title ? 'mt-0.5' : ''}>{children}</div></div>
    </div>
  );
}

/* ---------- Layout helpers ---------- */
export function PageHeader({ title, subtitle, crumbs = [], actions }) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-slate-500">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {c.to ? <Link to={c.to} className="hover:text-brand-700 hover:underline">{c.label}</Link> : <span aria-current="page" className="font-medium text-slate-700">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 'md', tone = 'blue', className = '' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' };
  const tones = {
    blue: 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-xs',
    teal: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-xs',
    slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xs',
    red: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xs'
  };
  return <div aria-hidden className={`grid shrink-0 place-items-center rounded-xl font-semibold tracking-wider ${sizes[size]} ${tones[tone]} ${className}`}>{initials(name)}</div>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${value === t.id ? 'border-brand-600 text-brand-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          {t.label}{t.count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows, empty, rowKey = 'id' }) {
  if (!rows?.length) return empty || <EmptyState title="Nothing here yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {columns.map((c) => <th key={c.header} scope="col" className={`px-4 py-3 ${c.className || ''}`}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={row[rowKey] || row._id || i} className="hover:bg-slate-50/80 transition-colors">
              {columns.map((c) => <td key={c.header} className={`px-4 py-3 align-top ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin text-brand-600 ${className}`} aria-label="Loading" />;
