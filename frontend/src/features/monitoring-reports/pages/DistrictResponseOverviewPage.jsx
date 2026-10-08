import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MonitoringStatCard from '../components/MonitoringStatCard';
import MonitoringTabs from '../components/MonitoringTabs';
import SituationMap from '../components/SituationMap';
import DataSourceNotice from '../components/DataSourceNotice';
import useMonitoringData from '../hooks/useMonitoringData';
import { monitoringService } from '../services/monitoringService';

const districtList = ['Colombo', 'Gampaha', 'Kandy', 'Matara'];
const tabs = ['Overview', 'Warnings', 'Reports', 'Shelters', 'Teams', 'Resources'];

export default function DistrictResponseOverviewPage() {
  const { district: districtParam } = useParams();
  const [district, setDistrict] = useState(districtParam || 'Colombo');
  const [activeTab, setActiveTab] = useState('Overview');
  useEffect(() => setDistrict(districtParam || 'Colombo'), [districtParam]);
  const { data: response, loading, error, source, notice } = useMonitoringData(
    () => monitoringService.getDistrictResponse(district), district,
  );

  if (loading || error || !response) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">District Response Overview</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
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
        <MonitoringStatCard title="Affected Population" value={Number(response.summary.affectedPopulation || 0).toLocaleString()} accent="amber" detail="Estimated at-risk" />
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

      <DistrictTabContent tab={activeTab} response={response} />
    </div>
  );
}

function DistrictTabContent({ tab, response }) {
  if (tab === 'Overview') {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 text-lg font-bold text-slate-800">Ongoing Incidents</h3><DataTable rows={response.incidents || []} columns={[
      ['type', 'Type'], ['location', 'Location'], ['severity', 'Severity'], ['status', 'Status'], ['reportedOn', 'Reported On'],
    ]} empty="No ongoing incidents are available for this district." /></div>;
  }

  const config = {
    Warnings: { title: 'Hazard Warnings', rows: response.hazardWarnings || response.warningHistory || [], columns: [['title', 'Warning'], ['type', 'Type'], ['severity', 'Severity'], ['status', 'Status'], ['createdAt', 'Issued']] },
    Reports: { title: 'Verified Hazard Reports', rows: response.hazardReports || [], columns: [['reportId', 'Report ID'], ['hazardType', 'Hazard'], ['status', 'Status'], ['submittedAt', 'Submitted']] },
    Shelters: { title: 'Shelter Status', rows: response.shelters || [], columns: [['name', 'Shelter'], ['capacity', 'Capacity'], ['occupied', 'Occupied'], ['status', 'Status']] },
    Teams: { title: 'Response Teams', rows: response.teams || [], columns: [['name', 'Team'], ['teamType', 'Team Type'], ['status', 'Status'], ['assignedAt', 'Updated']] },
    Resources: { title: 'Resource Availability', rows: response.resources || [], columns: [['resourceType', 'Resource'], ['quantity', 'Quantity'], ['status', 'Status'], ['organization', 'Organization']] },
  }[tab];

  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 text-lg font-bold text-slate-800">{config.title}</h3><DataTable rows={config.rows} columns={config.columns} empty={`No ${tab.toLowerCase()} records are available for this district.`} /></div>;
}

function DataTable({ rows, columns, empty }) {
  if (!rows.length) return <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{empty}</p>;
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr>{columns.map(([, label]) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || row.reportId || `${tabularName(row, columns)}-${index}`} className="border-t border-slate-200">{columns.map(([key]) => <td key={key} className="max-w-xs truncate px-4 py-3 text-slate-700">{formatCell(row[key])}</td>)}</tr>)}</tbody></table></div>;
}

function tabularName(row, columns) {
  return String(row[columns[0]?.[0]] || 'record');
}

function formatCell(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  return String(value).replaceAll('_', ' ');
}
