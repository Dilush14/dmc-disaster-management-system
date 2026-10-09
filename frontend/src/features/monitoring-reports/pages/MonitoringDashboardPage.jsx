import { BellRing, Siren, ShieldCheck, Users, Warehouse, Activity } from 'lucide-react';
import MonitoringLegend from '../components/MonitoringLegend';
import MonitoringStatCard from '../components/MonitoringStatCard';
import RecentActivityList from '../components/RecentActivityList';
import SituationMap from '../components/SituationMap';
import DataSourceNotice from '../components/DataSourceNotice';
import useMonitoringData from '../hooks/useMonitoringData';
import { monitoringService } from '../services/monitoringService';

export default function MonitoringDashboardPage() {
  const { data: summary, loading, error, source, notice } = useMonitoringData(
    () => monitoringService.getMonitoringSummary(), 'dashboard',
  );

  if (loading || error || !summary) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">Disaster Monitoring Dashboard</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
      <div className="flex items-center justify-between"> 
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Disaster Monitoring Dashboard</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <BellRing size={16} className="text-blue-700" />
          <span>Last updated {summary.lastUpdated}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['Last 24 Hours', 'Last 48 Hours', 'Last 7 Days'].map(option => (
          <button key={option} type="button" className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${option === 'Last 24 Hours' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {option}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard title="Active Warnings" value={summary.activeWarnings} detail="Across 12 districts" accent="red" icon={Siren} />
        <MonitoringStatCard title="Verified Reports" value={summary.verifiedReports} detail="Updated in real time" accent="green" icon={ShieldCheck} />
        <MonitoringStatCard title="Active Shelters" value={summary.activeShelters} detail="8 shelters active" accent="blue" icon={Warehouse} />
        <MonitoringStatCard title="Deployed Teams" value={summary.deployedTeams} detail="14 teams mobilized" accent="amber" icon={Users} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,.8fr)]">
        <div>
          <SituationMap items={[{ type: 'warning', label: 'Flood Warning', left: 22, top: 28 }, { type: 'report', label: 'Verified report', left: 45, top: 41 }, { type: 'shelter', label: 'Shelter', left: 68, top: 58 }, { type: 'team', label: 'Team', left: 56, top: 25 }]} />
          <MonitoringLegend />
        </div>
        <RecentActivityList items={summary.recentActivity} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Hazards by Type</h3>
          <div className="space-y-4">
            {summary.hazardsByType.map(item => (
              <div key={item.type}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>{item.type}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-300" style={{ width: `${(item.count / 12) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Reports by Status</h3>
          <div className="space-y-4">
            {summary.reportsByStatus.map(item => (
              <div key={item.status} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${item.status.toLowerCase().includes('verif') ? 'bg-emerald-500' : item.status.toLowerCase().includes('pending') ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-slate-700">{item.status.replaceAll('_', ' ')}</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
