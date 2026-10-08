import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Bell, CheckCircle2, Clock3, MoreHorizontal, Plus, Search, Siren } from 'lucide-react';
import { getHazardWarnings } from '../services/hazardWarningService';

const severityClass = { Severe: 'bg-red-100 text-red-700', High: 'bg-orange-100 text-orange-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-emerald-100 text-emerald-700' };
const statusClass = { Active: 'bg-emerald-100 text-emerald-700', Scheduled: 'bg-blue-100 text-blue-700', Expired: 'bg-slate-100 text-slate-500' };

function Stat({ icon: Icon, label, value, tone }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20}/></div>
    <div><div className="text-2xl font-black text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
  </div>;
}

export default function HazardWarningsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', severity: '', page: 0, size: 10 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getHazardWarnings(filters).then(result => {
      if (active) {
        setItems(result.items || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 0);
      }
    }).catch(nextError => {
      if (active) setError(nextError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [filters]);
  const rows = items;
  const summary = useMemo(() => ({
    active: total ? '—' : rows.filter(item => item.status === 'Active').length,
    scheduled: total ? '—' : rows.filter(item => item.status === 'Scheduled').length,
    expired: total ? '—' : rows.filter(item => item.status === 'Expired').length,
    total,
  }), [rows, total]);
  function changeFilter(name, value) {
    setFilters(current => ({ ...current, [name]: value, page: 0 }));
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Public safety communications</div><h1 className="mt-2 text-3xl font-black text-slate-900">Hazard Warning Dashboard</h1><p className="mt-1 text-sm text-slate-500">Monitor, create, and broadcast warnings to affected communities.</p></div>
      <Link to="/staff/warnings/create" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800"><Plus size={17}/> Create Warning</Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={AlertTriangle} label="Active Warnings" value={summary.active} tone="bg-red-50 text-red-600"/>
      <Stat icon={Clock3} label="Scheduled" value={summary.scheduled} tone="bg-blue-50 text-blue-600"/>
      <Stat icon={Bell} label="Expired" value={summary.expired} tone="bg-amber-50 text-amber-600"/>
      <Stat icon={BarChart3} label="Total This Month" value={summary.total} tone="bg-emerald-50 text-emerald-600"/>
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.7fr)]">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">Loading warnings…</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-lg font-bold">Current Hazard Situation</h2><span className="text-xs text-slate-500">Updated 10:45 AM</span></div>
        <div className="relative h-72 overflow-hidden bg-[#dcebdc] p-8">
          <div className="absolute inset-8 rounded-[42%] bg-[#b9d99c] opacity-80"/><div className="absolute left-[38%] top-[20%] h-36 w-40 rounded-[48%] bg-[#f4d35e] opacity-80"/><div className="absolute left-[48%] top-[35%] h-24 w-24 rounded-full bg-[#e76f51] opacity-80"/>
          <div className="relative z-10 flex h-full items-center justify-center text-center text-xs font-bold text-slate-600"><span className="rounded-lg bg-white/80 px-3 py-2 shadow-sm">Sri Lanka situation map<br/><span className="font-normal">3 active hazard areas</span></span></div>
          <div className="absolute bottom-3 right-3 space-y-1 rounded-lg bg-white/90 p-2 text-[10px] shadow-sm"><div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500"/> Severe</div><div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400"/> High</div><div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400"/> Medium</div></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">Warnings by Type</h2>{[['Flood',4,'bg-blue-500'],['Heavy Rainfall',3,'bg-slate-500'],['Landslide',2,'bg-amber-500'],['Strong Winds',1,'bg-teal-500']].map(([name,count,color]) => <div key={name} className="mb-4"><div className="mb-1 flex justify-between text-sm"><span>{name}</span><b>{count}</b></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{width:`${count*20}%`}}/></div></div>)}</div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold">Manage Warnings</h2><p className="text-sm text-slate-500">Search and filter broadcast warnings.</p></div><Link to="/staff/warnings/create" className="text-sm font-bold text-blue-700">Create new</Link></div>
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))]">
        <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={filters.search} onChange={event => changeFilter('search', event.target.value)} placeholder="Search ID, title or type" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></label>
        <select value={filters.status} onChange={event => changeFilter('status', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option>Active</option><option>Scheduled</option><option>Expired</option><option>Escalated</option><option>Cancelled</option></select>
        <select value={filters.type} onChange={event => changeFilter('type', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All types</option><option>Flood</option><option>Heavy Rainfall</option><option>Landslide</option><option>Strong Winds</option><option>Other</option></select>
        <select value={filters.severity} onChange={event => changeFilter('severity', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All severity</option><option>Severe</option><option>High</option><option>Medium</option><option>Low</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Type</th><th className="px-5 py-3">Affected Area</th><th className="px-5 py-3">Severity</th><th className="px-5 py-3">Valid Until</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{rows.map(w => <tr key={w.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{w.type}</td><td className="px-5 py-4 text-slate-600">{w.area || w.affectedAreas?.join(', ')}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityClass[w.severity]}`}>{w.severity}</span></td><td className="px-5 py-4 text-slate-600">{w.validUntil}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[w.status] || 'bg-slate-100 text-slate-600'}`}>{w.status}</span></td><td className="px-5 py-4"><Link to={`/staff/warnings/${w.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Open ${w.id}`}><MoreHorizontal size={18}/></Link></td></tr>)}</tbody></table></div>
      {!loading && rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No warnings match the selected filters.</p>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><span>{total} warning{total === 1 ? '' : 's'} found</span><div className="flex items-center gap-2"><button type="button" disabled={filters.page === 0 || loading} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><span>Page {totalPages ? filters.page + 1 : 0} of {totalPages || 0}</span><button type="button" disabled={filters.page + 1 >= totalPages || loading} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></div></div>
    </div>
  </div>;
}
