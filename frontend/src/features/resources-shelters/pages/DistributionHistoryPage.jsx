import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { listDistributions, updateDistributionStatus } from '../services/resourcesSheltersService';
import { filterDistributions, paginate } from '../utils/resourcesShelters';
import { Card, ErrorBanner, inputClass, Loading, PageHeader, Pagination, Select, StatusBadge, formatDate, useAsync } from '../components/ui';

const nextActions = { PENDING: ['IN_TRANSIT', 'COMPLETED', 'CANCELLED'], IN_TRANSIT: ['COMPLETED', 'CANCELLED'] };
const actionLabels = { IN_TRANSIT: 'Mark In Transit', COMPLETED: 'Mark Completed', CANCELLED: 'Cancel' };

export default function DistributionHistoryPage() {
  const { data, error, loading, reload, setData } = useAsync(signal => listDistributions(undefined, { signal }), []);
  const [filters, setFilters] = useState({ query: '', resource: 'All', district: 'All', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');
  const rows = data || [];
  const resourceNames = useMemo(() => [...new Set(rows.flatMap(row => row.items.map(item => item.name)))].sort(), [rows]);
  const districts = useMemo(() => [...new Set(rows.map(row => row.district))].sort(), [rows]);
  const setFilter = key => value => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };
  // One row per distributed item, as in the wireframe.
  const flat = filterDistributions(rows, filters).flatMap(row => row.items.map((item, index) => ({ row, item, key: `${row.id}-${index}`, first: index === 0 })));
  const current = paginate(flat, page);

  const changeStatus = async (row, status) => {
    if (status === 'CANCELLED' && !window.confirm('Cancel this distribution? Reserved stock will be returned to inventory.')) return;
    setBusyId(row.id);
    setActionError('');
    try {
      const updated = await updateDistributionStatus(row.id, status);
      setData(list => list.map(item => (item.id === updated.id ? updated : item)));
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Distribution History" subtitle="Every allocation recorded in the system." />
      {(error || actionError) && <ErrorBanner message={error || actionError} onRetry={error ? reload : undefined} />}
      {loading && !data && <Loading label="Loading distributions…" />}
      {data && (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input aria-label="Search distributions" className={`${inputClass} pl-9`} placeholder="Search distributions…" value={filters.query} onChange={event => setFilter('query')(event.target.value)} />
            </div>
            <Select label="Resource" value={filters.resource} onChange={setFilter('resource')} options={resourceNames} allLabel="All Resources" />
            <Select label="District" value={filters.district} onChange={setFilter('district')} options={districts} allLabel="All Districts" />
            <label className="flex items-center gap-2 text-sm text-slate-600">From<input type="date" className={`${inputClass} w-auto`} value={filters.from} onChange={event => setFilter('from')(event.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm text-slate-600">To<input type="date" className={`${inputClass} w-auto`} value={filters.to} onChange={event => setFilter('to')(event.target.value)} /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Date</th><th>Resource</th><th className="text-right">Quantity</th><th className="pl-4">Destination</th><th>District</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {current.rows.map(({ row, item, key, first }) => (
                  <tr key={key}>
                    <td className="py-2.5">{formatDate(row.distributionDate)}</td>
                    <td>{item.name}</td>
                    <td className="text-right">{Number(item.quantity).toLocaleString()}</td>
                    <td className="pl-4">{row.shelterName}</td>
                    <td>{row.district}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td className="space-x-2 whitespace-nowrap">
                      {first && (nextActions[row.status] || []).map(status => (
                        <button key={status} type="button" disabled={busyId === row.id} onClick={() => changeStatus(row, status)}
                          className={`text-xs font-semibold ${status === 'CANCELLED' ? 'text-rose-600' : 'text-blue-700'} disabled:opacity-40`}>{actionLabels[status]}</button>
                      ))}
                    </td>
                  </tr>
                ))}
                {!current.rows.length && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No distributions match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...current} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}
