import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Map, MoreHorizontal, Search, Users } from 'lucide-react';
import { getStaffHazardReports } from '../services/staffHazardReportService';

const statusStyle = { VERIFIED: 'bg-emerald-100 text-emerald-700', PENDING_VERIFICATION: 'bg-amber-100 text-amber-700', REJECTED: 'bg-red-100 text-red-700', ASSIGNED: 'bg-blue-100 text-blue-700' };
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

function Stat({ icon: Icon, value, title, tone }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={19}/></div><div><strong className="block text-2xl font-black">{value}</strong><span className="text-xs text-slate-500">{title}</span></div></div>;
}

export default function StaffHazardReportsPage() {
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getStaffHazardReports().then(data => active && setReports(data)).catch(nextError => active && setError(nextError.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const visible = useMemo(() => reports.filter(report => {
    const text = `${report.reportId} ${report.hazardType} ${report.description} ${report.location || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!status || report.status === status);
  }), [reports, query, status]);
  const counts = { total: reports.length, verified: reports.filter(item => item.status === 'VERIFIED').length, pending: reports.filter(item => item.status === 'PENDING_VERIFICATION').length, rejected: reports.filter(item => item.status === 'REJECTED').length };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Community intelligence</div><h1 className="mt-2 text-3xl font-black">Hazard Reports Dashboard</h1><p className="mt-1 text-sm text-slate-500">Review, verify, and coordinate citizen-submitted hazard reports.</p></div><Link to="/staff/hazard-reports/map" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><Map size={16}/> View on Map</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={AlertTriangle} value={counts.total} title="Total Reports" tone="bg-red-50 text-red-600"/><Stat icon={CheckCircle2} value={counts.verified} title="Verified Reports" tone="bg-emerald-50 text-emerald-600"/><Stat icon={Clock3} value={counts.pending} title="Pending Verification" tone="bg-amber-50 text-amber-600"/><Stat icon={Users} value={counts.rejected} title="Rejected Reports" tone="bg-slate-100 text-slate-600"/></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}{loading && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">Loading hazard reports…</p>}
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50 p-4"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none"/></label><select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option><option value="PENDING_VERIFICATION">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="ASSIGNED">Assigned</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Report ID</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Severity</th><th className="px-5 py-3">Reported On</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{visible.map(report => <tr key={report.reportId} className="border-t border-slate-100"><td className="px-5 py-4 font-bold">{report.reportId}</td><td className="px-5 py-4">{label(report.hazardType)}</td><td className="px-5 py-4 text-slate-600">{report.location || `${Number(report.latitude).toFixed(3)}, ${Number(report.longitude).toFixed(3)}`}</td><td className="px-5 py-4"><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold">High</span></td><td className="px-5 py-4 text-slate-600">{new Date(report.submittedAt || report.dateTime).toLocaleString()}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[report.status] || 'bg-slate-100 text-slate-600'}`}>{label(report.status)}</span></td><td className="px-5 py-4"><Link to={`/staff/hazard-reports/${report.reportId}`} aria-label={`Open ${report.reportId}`} className="text-slate-500"><MoreHorizontal size={18}/></Link></td></tr>)}</tbody></table></div>{!loading && !visible.length && <p className="p-8 text-center text-sm text-slate-500">No reports match the selected filters.</p>}</div>
  </div>;
}
