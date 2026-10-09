export default function ReportSectionSelector({ sections = [], selected = [], onToggle }) {
  return (
    <div className="space-y-3">
      {sections.map(section => {
        const checked = selected.includes(section);
        return (
          <label key={section} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
            <span className="font-medium">{section}</span>
            <input type="checkbox" checked={checked} onChange={() => onToggle(section)} className="h-4 w-4 accent-blue-600" />
          </label>
        );
      })}
    </div>
  );
}
