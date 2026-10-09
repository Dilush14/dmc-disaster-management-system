import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MonitoringTab from '../components/MonitoringTabs';
import DataSourceNotice from '../components/DataSourceNotice';
import ShelterStatusTable from '../components/ShelterStatusTable';
import useMonitoringData from '../hooks/useMonitoringData';
import { monitoringService } from '../services/monitoringService';

const tabs = ['Shelters', 'Response Teams', 'Resources', 'Critical Infrastructure'];

export default function ResourcesSheltersMonitoringPage() {
  const [activeTab, setActiveTab] = useState('Shelters');
  const { district = 'Colombo' } = useParams();
  const { data: monitoring, loading, error, source, notice } = useMonitoringData(
    () => monitoringService.getShelterMonitoring(district), district,
  );

  if (loading || error || !monitoring) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">Resources & Shelters Monitoring</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }

  const currentRows = activeTab === 'Shelters' ? monitoring.shelters
    : activeTab === 'Response Teams' ? monitoring.teams
      : activeTab === 'Resources' ? monitoring.resources
        : monitoring.criticalInfrastructure;
  const currentTitle = activeTab === 'Shelters' ? 'Shelter Status'
    : activeTab === 'Response Teams' ? 'Response Team Status'
      : activeTab === 'Resources' ? 'Relief Resource Availability'
        : 'Critical Infrastructure Status';

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Resources & Shelters Monitoring</h1>
      </div>

      <MonitoringTab tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Shelters</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.totalShelters}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active Shelters</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.activeShelters}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Capacity</div><div className="mt-3 text-3xl font-black text-slate-900">{Number(monitoring.totalCapacity || 0).toLocaleString()}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Occupancy</div><div className="mt-3 text-3xl font-black text-slate-900">{Number(monitoring.currentOccupancy || 0).toLocaleString()}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">{currentTitle}</h3>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">View on Map</button>
          </div>
          {activeTab === 'Shelters' ? <ShelterStatusTable shelters={monitoring.shelters || []} /> : (
            <OperationalTable rows={currentRows || []} tab={activeTab} />
          )}
        </div>

        {activeTab === 'Shelters' && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Shelter Distribution</h3>
          <div className="space-y-4">
            {monitoring.statusBreakdown.map(item => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>{item.status}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${(item.count / monitoring.totalShelters) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}

function OperationalTable({ rows, tab }) {
  if (!rows.length) return <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No {tab.toLowerCase()} records are available from the backend yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700"><tr><th className="px-4 py-3">Name / Type</th><th className="px-4 py-3">District</th><th className="px-4 py-3">Quantity / Team</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id || `${row.name || row.type}-${index}`} className="border-t border-slate-200">
          <td className="px-4 py-3 font-medium text-slate-800">{row.name || row.resourceType || row.type || row.title || 'Unspecified'}</td>
          <td className="px-4 py-3 text-slate-600">{row.district || '—'}</td>
          <td className="px-4 py-3 text-slate-600">{row.quantity ?? row.teamName ?? row.assignedTeam ?? '—'}</td>
          <td className="px-4 py-3 text-slate-600">{row.status || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
