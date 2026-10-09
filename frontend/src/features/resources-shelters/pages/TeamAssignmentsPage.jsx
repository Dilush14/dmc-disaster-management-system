import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { listTeamAssignments } from '../services/resourcesSheltersService';
import { ASSIGNMENT_STATUSES, filterAssignments, paginate } from '../utils/resourcesShelters';
import { Card, ErrorBanner, formatDateTime, inputClass, Loading, PageHeader, Pagination, Select, StatusBadge, useAsync } from '../components/ui';

const statusLabel = status => status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');

export default function TeamAssignmentsPage() {
  const { data, error, loading, reload } = useAsync(signal => listTeamAssignments({ signal }), []);
  const [filters, setFilters] = useState({ query: '', status: 'All', district: 'All' });
  const [page, setPage] = useState(1);
  const rows = data || [];
  const districts = useMemo(() => [...new Set(rows.map(row => row.district))].sort(), [rows]);
  const setFilter = key => value => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };
  const current = paginate(filterAssignments(rows, filters), page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Assignments"
        subtitle="Rescue teams assigned to move evacuees to shelters."
        action={<Link to="/staff/resources-shelters/teams/assign" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} />Assign Team</Link>}
      />
      {error && <ErrorBanner message={`Team assignments are unavailable. ${error}`} onRetry={reload} />}
      {loading && !data && <Loading label="Loading team assignments…" />}
      {data && (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input aria-label="Search assignments" className={`${inputClass} pl-9`} placeholder="Search by ID, team, shelter or pickup…" value={filters.query} onChange={event => setFilter('query')(event.target.value)} />
            </div>
            <Select label="District" value={filters.district} onChange={setFilter('district')} options={districts} allLabel="All Districts" />
            <select aria-label="Status" className={`${inputClass} w-auto`} value={filters.status} onChange={event => setFilter('status')(event.target.value)}>
              <option value="All">All Status</option>
              {ASSIGNMENT_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Assignment</th><th>Team</th><th>Shelter</th><th className="text-right">Evacuees</th><th className="pl-4">Pickup</th><th>Assigned</th><th>Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {current.rows.map(row => (
                  <tr key={row.id}>
                    <td className="py-2.5"><Link to={encodeURIComponent(row.id)} relative="path" className="font-semibold text-blue-700">{row.id}</Link></td>
                    <td>{row.teamName}</td>
                    <td><div>{row.shelterName}</div><div className="text-xs text-slate-400">{row.district}</div></td>
                    <td className="text-right">{Number(row.expectedEvacuees).toLocaleString()}</td>
                    <td className="pl-4">{row.pickupLocation}</td>
                    <td className="text-slate-500">{formatDateTime(row.assignedAt)}</td>
                    <td><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
                {!current.rows.length && <tr><td colSpan="7" className="py-8 text-center text-slate-500">{rows.length ? 'No assignments match these filters.' : 'No teams have been assigned yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...current} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}
