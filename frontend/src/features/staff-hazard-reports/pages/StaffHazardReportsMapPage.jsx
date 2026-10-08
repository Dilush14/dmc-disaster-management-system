import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStaffHazardReports } from '../services/staffHazardReportService';

const statusStyle = {
  VERIFIED: 'bg-emerald-500',
  PENDING_VERIFICATION: 'bg-amber-500',
  REJECTED: 'bg-red-500',
  ASSIGNED: 'bg-blue-500'
};
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

function coordinates(report) {
  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}

export default function StaffHazardReportsMapPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getStaffHazardReports()
      .then(data => active && setReports(data))
      .catch(nextError => active && setError(nextError.message));
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => reports.filter(report => {
    const text = `${report.reportId} ${report.hazardType} ${report.description || ''}`.toLowerCase();
    return (!status || report.status === status) && (!query || text.includes(query.toLowerCase()));
  }), [reports, status, query]);
  const located = useMemo(() => visible.map(report => ({ report, position: coordinates(report) })).filter(item => item.position), [visible]);
  const mapCenter = useMemo(() => located.length
    ? [located.reduce((sum, item) => sum + item.position.latitude, 0) / located.length, located.reduce((sum, item) => sum + item.position.longitude, 0) / located.length]
    : [7.8731, 80.7718], [located]);

  useEffect(() => {
    if (!visible.length) {
      setSelected(null);
      return;
    }
    if (!selected || !visible.some(report => report.reportId === selected.reportId))
      setSelected(visible[0]);
  }, [visible, selected]);

  useEffect(() => {
    const map = L.map('hazard-reports-map', { zoomControl: true, scrollWheelZoom: true });
    const markers = new Map();
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    located.forEach(({ report, position }) => {
      const marker = L.circleMarker([position.latitude, position.longitude], {
        radius: selected?.reportId === report.reportId ? 11 : 8,
        color: '#fff',
        weight: 2,
        fillColor: report.status === 'VERIFIED' ? '#10b981' : report.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
        fillOpacity: 1
      }).addTo(map);
      marker.bindTooltip(`${label(report.hazardType)} · ${label(report.status)}`);
      marker.on('click', () => setSelected(report));
      markers.set(report.reportId, marker);
    });
    if (located.length === 1) map.setView(mapCenter, 13);
    else if (located.length > 1) map.fitBounds(L.latLngBounds(located.map(item => [item.position.latitude, item.position.longitude])).pad(0.2));
    else map.setView(mapCenter, 7);
    return () => map.remove();
  }, [located, selected?.reportId, mapCenter]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Link to="/staff/hazard-reports" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16}/> Back to reports</Link><div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Geographic review</div><h1 className="mt-2 text-3xl font-black">Hazard Reports Map</h1><p className="mt-1 text-sm text-slate-500">Review the submitted locations of citizen hazard reports.</p></div>
      <div className="flex gap-2"><label className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports" className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none"/></label><select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option><option value="PENDING_VERIFICATION">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 text-sm"><span className="font-bold">{located.length} report{located.length === 1 ? '' : 's'} with coordinates</span><span className="text-slate-500">{visible.length} matching</span></div>
        <div className="relative h-[620px] min-h-[420px] bg-slate-100">
          <div id="hazard-reports-map" className="h-full w-full"/>
          {!located.length && <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"><p className="rounded-xl bg-white/95 p-4 text-center text-sm text-slate-600 shadow">No matching reports have valid coordinates.</p></div>}
        </div>
        <div className="flex flex-wrap gap-4 border-t border-slate-100 p-4 text-xs font-semibold text-slate-600"><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-amber-500"/>Pending</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-emerald-500"/>Verified</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-red-500"/>Rejected</span></div>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{selected ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected report</p><h2 className="mt-1 text-lg font-black">{selected.reportId}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${statusStyle[selected.status] || 'bg-slate-600'}`}>{label(selected.status)}</span></div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Hazard type</dt><dd className="mt-1 font-bold">{label(selected.hazardType)}</dd></div><div><dt className="text-slate-500">Coordinates</dt><dd className="mt-1 font-bold">{coordinates(selected).latitude.toFixed(6)}, {coordinates(selected).longitude.toFixed(6)}</dd></div><div><dt className="text-slate-500">Description</dt><dd className="mt-1 leading-6 text-slate-700">{selected.description || 'No description provided.'}</dd></div><div><dt className="text-slate-500">Submitted</dt><dd className="mt-1 font-semibold">{new Date(selected.submittedAt || selected.dateTime).toLocaleString()}</dd></div></dl><Link to={`/staff/hazard-reports/${selected.reportId}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">Open report details <ExternalLink size={15}/></Link></> : <div className="flex min-h-64 items-center justify-center text-center text-sm text-slate-500"><p><MapPin className="mx-auto mb-3 text-blue-700" size={28}/><b className="block text-slate-800">Select a marker</b>Choose a marker to inspect the report.</p></div>}</aside>
    </div>
  </div>;
}
