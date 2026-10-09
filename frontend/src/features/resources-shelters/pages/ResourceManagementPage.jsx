import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { listResources } from '../services/resourcesSheltersService';
import { filterResources, paginate, RESOURCE_CATEGORIES } from '../utils/resourcesShelters';
import { ResourceFormDialog } from '../components/FormDialogs';
import { Card, ErrorBanner, inputClass, Loading, Refreshing, PageHeader, Pagination, PrimaryButton, Select, StatusBadge, useAsync } from '../components/ui';

const categoryTabs = ['All', ...RESOURCE_CATEGORIES];

export default function ResourceManagementPage() {
  const { data: resources, error, loading, reload } = useAsync(signal => listResources({ signal }), []);
  const [filters, setFilters] = useState({ query: '', category: 'All', status: 'All' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const setFilter = key => value => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };
  const current = paginate(filterResources(resources || [], filters), page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Management"
        subtitle="Relief stock levels across DMC warehouses."
        action={<PrimaryButton onClick={() => setEditing('new')}><Plus size={16} />Add Resource</PrimaryButton>}
      />
      {error && <ErrorBanner message={`Resource information is unavailable. ${error}`} onRetry={reload} />}
      {loading && !resources && <Loading label="Loading resources…" />}
      {loading && resources && <Refreshing />}
      {resources && (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            {categoryTabs.map(tab => (
              <button key={tab} type="button" onClick={() => setFilter('category')(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filters.category === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab === 'All' ? 'All Resources' : tab}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input aria-label="Search resources" className={`${inputClass} pl-9`} placeholder="Search resources…" value={filters.query} onChange={event => setFilter('query')(event.target.value)} />
            </div>
            <Select label="Category" value={filters.category} onChange={setFilter('category')} options={RESOURCE_CATEGORIES} allLabel="All Categories" />
            <Select label="Status" value={filters.status} onChange={setFilter('status')} options={['Available', 'Low Stock', 'Out of Stock']} allLabel="All Status" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Item Name</th><th>Category</th><th className="text-right">Total Quantity</th><th className="text-right">Available</th><th>Unit</th><th className="pl-4">Status</th><th>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {current.rows.map(resource => (
                  <tr key={resource.id}>
                    <td className="py-2.5 font-medium text-slate-800">{resource.name}</td>
                    <td>{resource.category}</td>
                    <td className="text-right">{resource.totalQuantity.toLocaleString()}</td>
                    <td className={`text-right ${resource.status !== 'Available' ? 'font-semibold text-rose-600' : ''}`}>{resource.available.toLocaleString()}</td>
                    <td>{resource.unit}</td>
                    <td className="pl-4"><StatusBadge status={resource.status} /></td>
                    <td><button type="button" onClick={() => setEditing(resource)} className="text-sm font-semibold text-blue-700">Update Stock</button></td>
                  </tr>
                ))}
                {!current.rows.length && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No resources match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...current} onChange={setPage} />
        </Card>
      )}
      {editing && (
        <ResourceFormDialog
          resource={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}
