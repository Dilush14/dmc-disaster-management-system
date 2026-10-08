import { useParams } from 'react-router-dom';
import DataSourceNotice from '../components/DataSourceNotice';
import MonitoringLegend from '../components/MonitoringLegend';
import useMonitoringData from '../hooks/useMonitoringData';
import { monitoringService } from '../services/monitoringService';

const layerOptions = ['Hazard Warnings', 'Hazard Reports', 'Shelters', 'Deployed Teams', 'Road Status', 'Weather Radar', 'River Levels', 'District Boundaries'];

export default function RealtimeMonitoringPage() {
  const { district = 'Colombo' } = useParams();
  const { data, loading, error, source, notice } = useMonitoringData(
    () => monitoringService.getRealtimeMonitoringData(district), district,
  );

  if (loading || error || !data) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">Real-Time Monitoring</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Real-Time Monitoring</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {(data.layers || layerOptions).map(layer => (
              <label key={layer} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-blue-600" />
                {layer}
              </label>
            ))}
          </div>
          <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#dfe7f5_25%,_#c9d8ee_55%,_#edf4ff_100%)]">
            <div className="absolute left-10 top-10 h-44 w-40 rotate-12 rounded-[55%] border border-slate-300 bg-slate-200/30" />
            <div className="absolute right-12 top-20 h-28 w-32 rotate-[-20deg] rounded-[60%] border border-slate-300 bg-slate-200/30" />
            <div className="absolute bottom-12 left-32 h-20 w-24 rotate-12 rounded-[50%] border border-slate-300 bg-slate-200/30" />
            {(data.activeItems || []).map((item, index) => (
              <div key={item.id} className="absolute" style={{ left: `${18 + index * 18}%`, top: `${20 + index * 16}%` }}>
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${item.type === 'Warning' ? 'bg-red-500' : item.type === 'Report' ? 'bg-amber-400' : item.type === 'Shelter' ? 'bg-emerald-500' : 'bg-blue-600'}`} />
              </div>
            ))}
          </div>
          <MonitoringLegend />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Active Items</h3>
          <div className="space-y-3">
            {(data.activeItems || []).length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No active items are currently available for {district}.</p>}
            {(data.activeItems || []).map(item => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${item.severity === 'High' ? 'bg-red-100 text-red-700' : item.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.severity}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">{item.location}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
