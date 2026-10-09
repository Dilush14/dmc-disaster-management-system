export default function RecentActivityList({ items = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">{item.type}</span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{item.time}</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
