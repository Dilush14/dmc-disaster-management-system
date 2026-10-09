import { MAX_SUPPORT_TEAMS, supportTeamOptions, toggleSupportTeam } from '../utils/resourcesShelters';
import { inputClass, StatusBadge } from './ui';

/** Checkbox list of available teams that can join an assignment as support (max 5). */
export function SupportTeamPicker({ teams, primaryTeamId, excludeIds = [], selected, onChange, limit = MAX_SUPPORT_TEAMS }) {
  const rows = supportTeamOptions(teams, primaryTeamId, excludeIds);
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">{selected.length} of {limit} selected</p>
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 px-2 py-2" /><th>Team</th><th>Agency</th><th>District</th><th className="pr-3 text-right">Members</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(team => {
              const checked = selected.includes(team.id);
              const disabled = !checked && selected.length >= limit;
              return (
                <tr key={team.id} className={disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'} onClick={() => !disabled && onChange(toggleSupportTeam(selected, team.id, limit))}>
                  <td className="px-2 py-2"><input type="checkbox" aria-label={`Add ${team.name} as support`} checked={checked} disabled={disabled} onChange={() => onChange(toggleSupportTeam(selected, team.id, limit))} onClick={event => event.stopPropagation()} /></td>
                  <td className="font-medium text-slate-800">{team.name}</td>
                  <td>{team.agency}</td>
                  <td>{team.district}</td>
                  <td className="pr-3 text-right">{team.memberCount}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan="5" className="py-6 text-center text-slate-500">No other teams are available right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Quantity inputs for relief stock sent with the team. Blank means not sent. */
export function SupportResourcePicker({ resources, selection, onChange, error }) {
  const set = id => event => {
    const value = event.target.value;
    onChange(current => {
      const next = { ...current };
      if (value === '') delete next[id];
      else next[id] = value;
      return next;
    });
  };
  return (
    <div>
      {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Resource</th><th className="text-right">Available</th><th className="pl-4">Status</th><th className="w-32 pr-3">Quantity</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map(resource => (
              <tr key={resource.id}>
                <td className="px-3 py-2 font-medium text-slate-800">{resource.name}</td>
                <td className="text-right">{Number(resource.available).toLocaleString()} {resource.unit}</td>
                <td className="pl-4"><StatusBadge status={resource.status} /></td>
                <td className="py-1 pr-3"><input type="number" min="1" aria-label={`${resource.name} quantity`} className={inputClass} placeholder="0" value={selection[resource.id] ?? ''} onChange={set(resource.id)} /></td>
              </tr>
            ))}
            {!resources.length && <tr><td colSpan="4" className="py-6 text-center text-slate-500">No resources are recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
