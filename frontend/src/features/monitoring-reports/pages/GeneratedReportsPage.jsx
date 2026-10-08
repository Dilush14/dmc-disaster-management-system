import { useNavigate } from 'react-router-dom';
import GeneratedReportTable from '../components/GeneratedReportTable';
import { getGeneratedReports } from '../utils/monitoringReports';

export default function GeneratedReportsPage() {
  const navigate = useNavigate();
  const reports = getGeneratedReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Generated Reports</h1>
        </div>
        <button type="button" onClick={() => navigate('/staff/reports/generate')} className="rounded-xl bg-blue-700 px-4 py-2 font-medium text-white">+ New Report</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Report History</h2>
          <div className="flex gap-2 text-sm text-slate-600">
            <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">All</button>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">Last 30 days</button>
          </div>
        </div>

        <GeneratedReportTable reports={reports} />

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>Showing 1–3 of 3 reports</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1">Previous</button>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
