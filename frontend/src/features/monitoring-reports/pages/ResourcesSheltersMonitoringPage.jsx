import { useState } from 'react';
import MonitoringTab from '../components/MonitoringTabs';
import ShelterStatusTable from '../components/ShelterStatusTable';
import { getShelterMonitoring } from '../utils/monitoringReports';

const tabs = ['Shelters', 'Response Teams', 'Resources', 'Critical Infrastructure'];

export default function ResourcesSheltersMonitoringPage() {
  const [activeTab, setActiveTab] = useState('Shelters');
  const monitoring = getShelterMonitoring('Colombo');

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Resources & Shelters Monitoring</h1>
      </div>

      <MonitoringTab tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Shelters</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.totalShelters}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active Shelters</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.activeShelters}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Capacity</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.totalCapacity.toLocaleString()}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Occupancy</div><div className="mt-3 text-3xl font-black text-slate-900">{monitoring.currentOccupancy.toLocaleString()}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Shelter Status</h3>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">View on Map</button>
          </div>
          <ShelterStatusTable shelters={monitoring.shelters} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
