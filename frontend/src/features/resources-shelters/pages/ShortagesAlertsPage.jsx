import { Link } from 'react-router-dom';
import { Boxes, House } from 'lucide-react';
import { getAlerts } from '../services/resourcesSheltersService';
import { Card, ErrorBanner, Loading, PageHeader, StatusBadge, useAsync } from '../components/ui';

export default function ShortagesAlertsPage() {
  const { data, error, loading, reload } = useAsync(signal => getAlerts({ signal }), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Resource & Shelter Shortages Monitoring" subtitle="Shelters at 75% occupancy or more, and relief items at or below their low-stock threshold." />
      {error && <ErrorBanner message={`Alerts are unavailable. ${error}`} onRetry={reload} />}
      {loading && !data && <Loading label="Loading alerts…" />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Shelter Capacity Alerts">
            <ul className="divide-y divide-slate-100">
              {data.shelterAlerts.map(alert => (
                <li key={alert.shelterId} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3">
                    <House size={20} className={alert.level === 'Critical' ? 'text-rose-600' : 'text-orange-500'} />
                    <span>
                      <Link to={`/staff/resources-shelters/shelters/${alert.shelterId}`} className="block text-sm font-semibold text-slate-800 hover:text-blue-700">{alert.name}</Link>
                      <span className="text-xs text-slate-500">{alert.occupancyRate}% {alert.occupancyRate >= 100 ? 'Full Capacity' : 'High Occupancy'} · {alert.district}</span>
                    </span>
                  </span>
                  <StatusBadge status={alert.level} />
                </li>
              ))}
              {!data.shelterAlerts.length && <li className="py-3 text-sm text-slate-500">No shelters are near capacity.</li>}
            </ul>
          </Card>
          <Card title="Resource Stock Alerts">
            <ul className="divide-y divide-slate-100">
              {data.resourceAlerts.map(alert => (
                <li key={alert.resourceId} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3">
                    <Boxes size={20} className={alert.level === 'Critical' ? 'text-rose-600' : 'text-amber-500'} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{alert.name}</span>
                      <span className="text-xs text-slate-500">{Number(alert.available).toLocaleString()} {alert.unit.toLowerCase()}s remaining</span>
                    </span>
                  </span>
                  <StatusBadge status={alert.level} />
                </li>
              ))}
              {!data.resourceAlerts.length && <li className="py-3 text-sm text-slate-500">All resources are sufficiently stocked.</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
