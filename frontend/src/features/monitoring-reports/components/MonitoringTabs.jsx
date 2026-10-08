export default function MonitoringTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white text-blue-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
