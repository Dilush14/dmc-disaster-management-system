export default function SituationMap({ items = [], title = 'Current Situation Map' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#dfe7f5_25%,_#c9d8ee_55%,_#edf4ff_100%)]">
        <div className="absolute inset-x-8 top-6 h-28 rounded-[52%] border border-sky-300/60 bg-sky-200/20" />
        <div className="absolute left-12 top-12 h-24 w-28 rotate-12 rounded-[55%] border border-slate-300 bg-slate-200/35" />
        <div className="absolute right-16 bottom-12 h-16 w-24 rotate-[-18deg] rounded-[52%] border border-slate-300 bg-slate-200/30" />
        {items.map((item, index) => {
          const tone = item.type === 'warning' ? 'bg-red-500' : item.type === 'report' ? 'bg-amber-400' : item.type === 'shelter' ? 'bg-emerald-500' : 'bg-blue-600';
          const left = item.left ?? 20 + (index * 18) % 60;
          const top = item.top ?? 18 + (index * 20) % 52;
          return (
            <div key={`${item.label}-${index}`} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
              <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${tone}`} title={item.label} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
