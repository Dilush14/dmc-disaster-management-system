export default function ReportTypeCard({ title, description, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${selected ? 'border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
          {title.slice(0, 1)}
        </div>
        {selected && <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">Selected</span>}
      </div>
      <div className="text-lg font-bold text-slate-800">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{description}</div>
    </button>
  );
}
