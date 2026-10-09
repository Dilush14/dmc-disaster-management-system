import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';

const badgeTones = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Full: 'bg-rose-50 text-rose-700 ring-rose-200',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  'Out of Stock': 'bg-rose-50 text-rose-700 ring-rose-200',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-200',
  'Low Stock': 'bg-amber-50 text-amber-700 ring-amber-200',
  High: 'bg-orange-50 text-orange-700 ring-orange-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 ring-blue-200',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 ring-blue-200',
  RESPONDING: 'bg-violet-50 text-violet-700 ring-violet-200',
  UNAVAILABLE: 'bg-slate-100 text-slate-600 ring-slate-200',
  COMM_FAILURE: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const statusLabels = {
    PENDING: 'Pending', IN_TRANSIT: 'In Transit', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  AVAILABLE: 'Available', ASSIGNED: 'Assigned', DISPATCHED: 'Dispatched', RESPONDING: 'Responding', UNAVAILABLE: 'Unavailable', COMM_FAILURE: 'Comm Failure',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${badgeTones[status] || badgeTones.Inactive}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const sections = [
  { to: '/staff/resources-shelters', label: 'Overview', end: true },
  { to: '/staff/resources-shelters/shelters', label: 'Shelters' },
  { to: '/staff/resources-shelters/resources', label: 'Resources' },
  { to: '/staff/resources-shelters/teams', label: 'Rescue Teams', end: true },
  { to: '/staff/resources-shelters/teams/assignments', label: 'Team Assignments' },
  { to: '/staff/resources-shelters/allocate', label: 'Allocate' },
  { to: '/staff/resources-shelters/distributions', label: 'Distribution History' },
  { to: '/staff/resources-shelters/alerts', label: 'Shortages & Alerts' },
];

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Resources & Shelters</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Resources and shelters sections">
        {sections.map(section => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Numbered wizard progress used by the allocation and team-assignment flows. */
export function Stepper({ steps, step }) {
  return (
    <ol className={`mb-6 grid gap-2`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, index) => {
        const number = index + 1;
        const done = step > number;
        const active = step === number;
        return (
          <li key={label} className="flex flex-col items-center gap-1 text-center">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {done ? <Check size={16} /> : number}
            </span>
            <span className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-slate-500'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props}>{children}</button>;
}

export function SecondaryButton({ children, className = '', ...props }) {
  return <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props}>{children}</button>;
}

export const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export function Field({ label, error, required, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-700">{label}{required && <span className="text-rose-600"> *</span>}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export function Select({ value, onChange, options, label, allLabel }) {
  return (
    <select aria-label={label} className={`${inputClass} w-auto`} value={value} onChange={event => onChange(event.target.value)}>
      {allLabel && <option value="All">{allLabel}</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span className="flex items-center gap-2"><AlertTriangle size={16} />{message}</span>
      {onRetry && <SecondaryButton onClick={onRetry}><RefreshCw size={14} />Retry</SecondaryButton>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">{label}</div>;
}

export function OccupancyBar({ rate }) {
  const tone = rate >= 100 ? 'bg-rose-500' : rate >= 85 ? 'bg-orange-500' : rate >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, rate)}%` }} />
    </div>
  );
}

export function Pagination({ page, pages, start, end, total, onChange }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <span>Showing {start} - {end} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
        {Array.from({ length: pages }, (_, index) => index + 1).map(number => (
          <button key={number} type="button" onClick={() => onChange(number)} className={`h-8 min-w-8 rounded-md px-2 font-semibold ${number === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{number}</button>
        ))}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function Modal({ title, icon, tone = 'blue', onClose, children, footer }) {
  useEffect(() => {
    const onKey = event => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const tones = { blue: 'text-blue-600', amber: 'text-amber-500', red: 'text-rose-600' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && <span className={tones[tone]}>{icon}</span>}
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Loads async data with loading/error state and a reload() for the Retry exception flow. */
export function useAsync(load, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    run(controller.signal)
      .then(data => setState({ data, error: '', loading: false }))
      .catch(error => {
        if (error.name !== 'AbortError') setState(current => ({ ...current, error: error.message, loading: false }));
      });
    return controller;
  }, [run]);
  useEffect(() => {
    const controller = reload();
    return () => controller.abort();
  }, [reload]);
  return { ...state, reload, setData: data => setState(current => ({ ...current, data: typeof data === 'function' ? data(current.data) : data })) };
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${formatDate(value)}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
