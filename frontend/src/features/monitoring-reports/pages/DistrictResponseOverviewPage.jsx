import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MonitoringStatCard from '../components/MonitoringStatCard';
import MonitoringTabs from '../components/MonitoringTabs';
import SituationMap from '../components/SituationMap';
import { getDistrictResponse } from '../utils/monitoringReports';

const districtList = ['Colombo', 'Gampaha', 'Kandy', 'Matara'];
const tabs = ['Overview', 'Warnings', 'Reports', 'Shelters', 'Teams', 'Resources'];

export default function DistrictResponseOverviewPage() {
  const { district: districtParam } = useParams();
  const [district, setDistrict] = useState(districtParam || 'Colombo');
  const [activeTab, setActiveTab] = useState('Overview');
  const response = getDistrictResponse(district);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">District Response Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">District</label>
          <select value={district} onChange={event => setDistrict(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {districtList.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard title="Active Warnings" value={response.summary.activeWarnings} accent="red" detail="Live monitors" />
        <MonitoringStatCard title="Verified Reports" value={response.summary.verifiedReports} accent="green" detail="Field validation" />
        <MonitoringStatCard title="Active Shelters" value={response.summary.activeShelters} accent="blue" detail="Operational sites" />
        <MonitoringStatCard title="Affected Population" value={response.summary.affectedPopulation.toLocaleString()} accent="amber" detail="Estimated at-risk" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,.8fr)]">
        <div className="space-y-4">
          <SituationMap items={[{ type: 'warning', label: 'Warning', left: 30, top: 22 }, { type: 'report', label: 'Report', left: 52, top: 40 }, { type: 'shelter', label: 'Shelter', left: 65, top: 62 }, { type: 'team', label: 'Team', left: 48, top: 58 }]} title="District Map" />
          <MonitoringTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">District Statistics</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>GN Divisions</span><strong>{response.statistics.gramaNiladhariDivisions}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Displaced People</span><strong>{response.statistics.displacedPeople}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Damaged Houses</span><strong>{response.statistics.damagedHouses}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Road Closures</span><strong>{response.statistics.roadClosures}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Power Interruptions</span><strong>{response.statistics.powerInterruptions}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Schools Closed</span><strong>{response.statistics.schoolsClosed}</strong></div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Ongoing Incidents</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reported On</th>
              </tr>
            </thead>
            <tbody>
              {response.incidents.map((incident, index) => (
                <tr key={`${incident.type}-${index}`} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-800">{incident.type}</td>
                  <td className="px-4 py-3 text-slate-600">{incident.location}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${incident.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{incident.severity}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${incident.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{incident.status}</span></td>
                  <td className="px-4 py-3 text-slate-600">{incident.reportedOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
