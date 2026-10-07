const legendItems = [
  { label: 'Hazard warning', color: 'bg-red-500' },
  { label: 'Verified report', color: 'bg-amber-400' },
  { label: 'Shelter', color: 'bg-emerald-500' },
  { label: 'Deployed team', color: 'bg-blue-600' },
];

export default function MonitoringLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
      {legendItems.map(item => (
        <div key={item.label} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
          <span className={`h-3 w-3 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
