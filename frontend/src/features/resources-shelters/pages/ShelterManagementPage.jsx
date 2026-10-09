import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Plus, Search } from 'lucide-react';
import { listShelters } from '../services/resourcesSheltersService';
import { countBy, filterShelters, paginate } from '../utils/resourcesShelters';
import { ShelterFormDialog } from '../components/FormDialogs';
import { Card, ErrorBanner, inputClass, Loading, Refreshing, OccupancyBar, PageHeader, Pagination, PrimaryButton, Select, StatusBadge, useAsync } from '../components/ui';

const statusTabs = ['All', 'Active', 'Full', 'Inactive'];

export default function ShelterManagementPage() {
  const navigate = useNavigate();
  const { data: shelters, error, loading, reload } = useAsync(signal => listShelters(undefined, { signal }), []);
  const [filters, setFilters] = useState({ query: '', district: 'All', status: 'All' });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);

  const all = shelters || [];
  const counts = countBy(all, 'status');
  const districts = useMemo(() => [...new Set(all.map(shelter => shelter.district))].sort(), [all]);
  const filtered = filterShelters(all, filters);
  const current = paginate(filtered, page);
  const selected = all.find(shelter => shelter.id === selectedId) || current.rows[0];
  const setFilter = key => value => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelter Management"
        subtitle="Register shelters, track capacity and update occupancy."
        action={<PrimaryButton onClick={() => setEditing('new')}><Plus size={16} />Register New Shelter</PrimaryButton>}
      />
      {error && <ErrorBanner message={`Shelter information is unavailable. ${error}`} onRetry={reload} />}
      {loading && !shelters && <Loading label="Loading shelters…" />}
      {loading && shelters && <Refreshing />}
      {shelters && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,.9fr)]">
          <Card>
            <div className="mb-4 flex flex-wrap gap-2">
              {statusTabs.map(tab => {
                const count = tab === 'All' ? all.length : counts[tab] || 0;
                return (
                  <button key={tab} type="button" onClick={() => setFilter('status')(tab)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filters.status === tab ? 'bg-blue-600 text-white' : tab === 'Full' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {tab === 'All' ? 'All Shelters' : tab} ({count})
                  </button>
                );
              })}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative min-w-56 flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input aria-label="Search shelters" className={`${inputClass} pl-9`} placeholder="Search shelters…" value={filters.query} onChange={event => setFilter('query')(event.target.value)} />
              </div>
              <Select label="District" value={filters.district} onChange={setFilter('district')} options={districts} allLabel="All Districts" />
              <Select label="Status" value={filters.status} onChange={setFilter('status')} options={statusTabs.slice(1)} allLabel="All Status" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Name</th><th>District</th><th className="text-right">Capacity</th><th className="text-right">Occupied</th><th className="text-right">Available</th><th className="pl-4">Status</th><th>Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {current.rows.map(shelter => (
                    <tr key={shelter.id} onClick={() => setSelectedId(shelter.id)} className={`cursor-pointer ${selected?.id === shelter.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="py-2.5 font-medium text-slate-800">{shelter.name}</td>
                      <td>{shelter.district}</td>
                      <td className="text-right">{shelter.capacity.toLocaleString()}</td>
                      <td className={`text-right ${shelter.status === 'Full' ? 'font-semibold text-rose-600' : ''}`}>{shelter.occupied.toLocaleString()}</td>
                      <td className="text-right">{shelter.available.toLocaleString()}</td>
                      <td className="pl-4"><StatusBadge status={shelter.status} /></td>
                      <td className="space-x-2 whitespace-nowrap">
                        <Link onClick={event => event.stopPropagation()} to={shelter.id} className="text-sm font-semibold text-blue-700">View</Link>
                        <button type="button" onClick={event => { event.stopPropagation(); setEditing(shelter); }} className="text-sm font-semibold text-slate-600">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {!current.rows.length && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No shelters match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination {...current} onChange={setPage} />
          </Card>

          <Card title="Selected Shelter">
            {selected ? (
              <div className="space-y-4">
                <div className="flex h-40 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#e2e8f0_60%)] text-blue-700">
                  <div className="text-center"><MapPin size={32} className="mx-auto" /><div className="mt-1 text-sm font-semibold">{selected.address}</div></div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">{selected.name}</div>
                  <div className="text-sm text-slate-500">{selected.district} District · {selected.shelterType}</div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-slate-500">Capacity</dt><dd className="font-semibold">{selected.capacity.toLocaleString()}</dd>
                  <dt className="text-slate-500">Occupied</dt><dd className="font-semibold">{selected.occupied.toLocaleString()} ({selected.occupancyRate}%)</dd>
                  <dt className="text-slate-500">Available</dt><dd className="font-semibold">{selected.available.toLocaleString()}</dd>
                  <dt className="text-slate-500">Status</dt><dd><StatusBadge status={selected.status} /></dd>
                </dl>
                <OccupancyBar rate={selected.occupancyRate} />
                <PrimaryButton className="w-full" onClick={() => navigate(selected.id)}>Open & Update Occupancy</PrimaryButton>
              </div>
            ) : <p className="text-sm text-slate-500">Select a shelter to see its details.</p>}
          </Card>
        </div>
      )}
      {editing && (
        <ShelterFormDialog
          shelter={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved => { setEditing(null); setSelectedId(saved.id); reload(); }}
        />
      )}
    </div>
  );
}
