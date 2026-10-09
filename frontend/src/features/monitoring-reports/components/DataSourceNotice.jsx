export default function DataSourceNotice({ source, notice, error, loading }) {
  if (loading) return <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Loading operational data…</p>;
  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Monitoring unavailable: {error}</p>;
  if (source === 'backend') return <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Data loaded from the operational API.</p>;
  return null;
}