import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Send } from 'lucide-react';
import { listTeams, setTeamAvailability } from '../services/resourcesSheltersService';
import { canChangeAvailability, DISTRICTS, filterTeams, paginate, TEAM_AGENCIES, TEAM_STATUSES } from '../utils/resourcesShelters';
import { TeamFormDialog } from '../components/FormDialogs';
import { Card, ErrorBanner, inputClass, Loading, PageHeader, Pagination, PrimaryButton, Select, StatusBadge, useAsync } from '../components/ui';

const statusLabel = status => status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');

export default function RescueTeamsPage() {
  const { data: teams, error, loading, reload, setData } = useAsync(signal => listTeams({ signal }), []);
  const [filters, setFilters] = useState({ query: '', district: 'All', agency: 'All', status: 'All' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const setFilter = key => value => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };
  const current = paginate(filterTeams(teams || [], filters), page);

  const toggleAvailability = async team => {
    setBusyId(team.id);
    setActionError('');
    try {
      const updated = await setTeamAvailability(team.id, team.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE');
      setData(rows => rows.map(row => (row.id === updated.id ? updated : row)));
    } catch (failure) {
      setActionError(failure.message);
      if (failure.status === 409) reload();
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rescue Teams"
        subtitle="Field teams from DMC and partner agencies, with their current availability."
        action={(
          <div className="flex gap-2">
            <Link to="/staff/resources-shelters/teams/assign" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Send size={16} />Assign Team</Link>
            <PrimaryButton onClick={() => setEditing('new')}><Plus size={16} />Register Team</PrimaryButton>
          </div>
        )}
      />
      {error && <ErrorBanner message={`Rescue team information is unavailable. ${error}`} onRetry={reload} />}
      {actionError && <ErrorBanner message={actionError} />}
      {loading && !teams && <Loading label="Loading rescue teams…" />}
      {teams && (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input aria-label="Search teams" className={`${inputClass} pl-9`} placeholder="Search by team, leader or ID…" value={filters.query} onChange={event => setFilter('query')(event.target.value)} />
            </div>
            <Select label="District" value={filters.district} onChange={setFilter('district')} options={DISTRICTS} allLabel="All Districts" />
            <Select label="Agency" value={filters.agency} onChange={setFilter('agency')} options={TEAM_AGENCIES} allLabel="All Agencies" />
            <select aria-label="Status" className={`${inputClass} w-auto`} value={filters.status} onChange={event => setFilter('status')(event.target.value)}>
              <option value="All">All Status</option>
              {TEAM_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Team</th><th>Agency</th><th>District</th><th className="text-right">Members</th><th className="pl-4">Leader</th><th>Capabilities</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {current.rows.map(team => {
                  const locked = !canChangeAvailability(team);
                  return (
                    <tr key={team.id}>
                      <td className="py-2.5"><div className="font-medium text-slate-800">{team.name}</div><div className="text-xs text-slate-400">{team.id}</div></td>
                      <td>{team.agency}</td>
                      <td>{team.district}</td>
                      <td className="text-right">{team.memberCount}</td>
                      <td className="pl-4"><div>{team.leader}</div><div className="text-xs text-slate-400">{team.contactNumber}</div></td>
                      <td className="text-xs text-slate-600">{(team.capabilities || []).join(', ')}</td>
                      <td><StatusBadge status={team.status} /></td>
                      <td>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={() => setEditing(team)} className="text-sm font-semibold text-blue-700">Edit</button>
                          {team.status === 'AVAILABLE' && <Link to={`/staff/resources-shelters/teams/assign?teamId=${encodeURIComponent(team.id)}`} className="text-sm font-semibold text-blue-700">Assign</Link>}
                          {team.currentAssignmentId?.startsWith('TA-') && <Link to={`/staff/resources-shelters/teams/assignments/${encodeURIComponent(team.currentAssignmentId)}`} className="text-sm font-semibold text-slate-700">View Assignment</Link>}
                          <button
                            type="button"
                            disabled={locked || busyId === team.id}
                            title={locked ? 'Availability is managed by dispatch while the team is on an assignment.' : undefined}
                            onClick={() => toggleAvailability(team)}
                            className="text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            {team.status === 'AVAILABLE' ? 'Mark Unavailable' : 'Mark Available'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!current.rows.length && <tr><td colSpan="8" className="py-8 text-center text-slate-500">No rescue teams match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...current} onChange={setPage} />
        </Card>
      )}
      {editing && (
        <TeamFormDialog
          team={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}
