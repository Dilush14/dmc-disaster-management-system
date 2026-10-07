export default function GenerationProgress({ progress = 0, steps = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Generating Report...</h3>
        <span className="text-sm font-semibold text-blue-700">{progress}%</span>
      </div>
      <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const done = progress >= ((index + 1) / steps.length) * 100;
          return (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? '✓' : index + 1}</span>
              <span className="text-sm text-slate-700">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
