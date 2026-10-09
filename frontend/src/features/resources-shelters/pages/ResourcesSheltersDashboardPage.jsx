import { Link } from 'react-router-dom';
import { Boxes, Droplets, HeartPulse, House, HousePlus, Package, ShowerHead, Users } from 'lucide-react';
import MonitoringStatCard from '../../monitoring-reports/components/MonitoringStatCard';
import { getOverview } from '../services/resourcesSheltersService';
import { occupancyBand } from '../utils/resourcesShelters';
import ActiveResponseBanner from '../components/ActiveResponseBanner';
import { Card, ErrorBanner, formatDateTime, Loading, Refreshing, PageHeader, StatusBadge, useAsync } from '../components/ui';

const bandStyles = {
  critical: { dot: 'bg-rose-500', cell: 'bg-rose-100 text-rose-800 ring-rose-200', label: '> 90% (Critical)' },
  high: { dot: 'bg-orange-400', cell: 'bg-orange-100 text-orange-800 ring-orange-200', label: '70% - 90% (High)' },
  medium: { dot: 'bg-amber-300', cell: 'bg-amber-50 text-amber-800 ring-amber-200', label: '40% - 70% (Medium)' },
  low: { dot: 'bg-emerald-500', cell: 'bg-emerald-50 text-emerald-800 ring-emerald-200', label: '< 40% (Low)' },
};

const resourceIcons = { 'Food & Water': Package, 'Medical Supplies': HeartPulse, 'Relief Items': Boxes, Equipment: Boxes };

export default function ResourcesSheltersDashboardPage() {
  const { data, error, loading, reload } = useAsync(signal => getOverview(undefined, { signal }), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Resources & Shelters Overview" subtitle="Live shelter capacity, occupancy and relief stock across districts." />
      <ActiveResponseBanner />
      {error && <ErrorBanner message={`Shelter information is unavailable. ${error}`} onRetry={reload} />}
      {loading && !data && <Loading label="Loading shelter information…" />}
      {loading && data && <Refreshing />}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MonitoringStatCard title="Total Shelters" value={data.totalShelters} icon={House} accent="red" />
            <MonitoringStatCard title="Active Shelters" value={data.activeShelters} icon={HousePlus} accent="green" />
            <MonitoringStatCard title="Total Capacity" value={data.totalCapacity.toLocaleString()} icon={Users} accent="blue" />
            <MonitoringStatCard title="Currently Occupied" value={data.currentOccupied.toLocaleString()} detail={`${data.occupancyRate}% of capacity`} icon={Users} accent="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card title="Shelter Occupancy by District">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.byDistrict.map(item => {
                  const style = bandStyles[occupancyBand(item.occupancyRate)];
                  return (
                    <div key={item.district} className={`rounded-xl p-3 ring-1 ${style.cell}`}>
                      <div className="text-sm font-bold">{item.district}</div>
                      <div className="text-xl font-black">{item.occupancyRate}%</div>
                      <div className="text-xs opacity-80">{item.occupied.toLocaleString()} / {item.capacity.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="font-semibold">Occupancy Rate</span>
                {Object.values(bandStyles).map(band => <span key={band.label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${band.dot}`} />{band.label}</span>)}
              </div>
            </Card>

            <Card title="Resource Availability" action={<Link to="resources" className="text-sm font-semibold text-blue-700">Manage</Link>}>
              <ul className="divide-y divide-slate-100">
                {data.resources.slice(0, 6).map(resource => {
                  const Icon = resource.name.includes('Water') ? Droplets : resource.name.includes('Hygiene') ? ShowerHead : resourceIcons[resource.category] || Boxes;
                  return (
                    <li key={resource.id} className="flex items-center justify-between py-2.5">
                      <span className="flex items-center gap-3 text-sm font-medium text-slate-700"><Icon size={18} className="text-blue-600" />{resource.name}</span>
                      <span className="text-right">
                        <span className={`block text-sm font-bold ${resource.status === 'Available' ? 'text-emerald-700' : 'text-rose-600'}`}>{resource.available.toLocaleString()}</span>
                        <span className="text-xs text-slate-500">{resource.status}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <Card title="Recent Shelter Updates" action={<Link to="shelters" className="text-sm font-semibold text-blue-700">View All</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Shelter Name</th><th>District</th><th>Occupancy</th><th>Last Updated</th><th>Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentUpdates.map(shelter => (
                    <tr key={shelter.id}>
                      <td className="py-2.5 font-medium"><Link className="hover:text-blue-700" to={`shelters/${shelter.id}`}>{shelter.name}</Link></td>
                      <td>{shelter.district}</td>
                      <td className={shelter.status === 'Full' ? 'font-semibold text-rose-600' : ''}>{shelter.occupied.toLocaleString()} / {shelter.capacity.toLocaleString()}</td>
                      <td className="text-slate-500">{formatDateTime(shelter.updatedAt)}</td>
                      <td><StatusBadge status={shelter.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
