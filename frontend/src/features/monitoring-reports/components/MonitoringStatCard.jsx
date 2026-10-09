export default function MonitoringStatCard({ title, value, detail, accent = 'blue', icon: Icon }) {
  const accentStyles = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-rose-50 text-rose-700 ring-rose-100',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</span>
        {Icon && <div className={`rounded-xl p-2 ring-1 ${accentStyles[accent]}`}><Icon size={18} /></div>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          {detail && <div className="mt-2 text-xs text-slate-500">{detail}</div>}
        </div>
      </div>
    </div>
  );
}
