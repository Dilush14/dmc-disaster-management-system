import { useNavigate } from 'react-router-dom';
import GeneratedReportTable from '../components/GeneratedReportTable';
import DataSourceNotice from '../components/DataSourceNotice';
import useMonitoringData from '../hooks/useMonitoringData';
import { reportService } from '../services/reportService';

export default function GeneratedReportsPage() {
  const navigate = useNavigate();
  const { data: reports, loading, error, source, notice } = useMonitoringData(
    async () => {
      try {
        return { data: await reportService.getGeneratedReports(), source: 'backend', notice: '' };
      } catch (requestError) {
        if (requestError.status === 401 || requestError.status === 403) throw requestError;
        if (![undefined, 404, 503].includes(requestError.status)) throw requestError;
        return {
          data: reportService.getDemoReports(),
          source: 'demo',
          notice: 'Report history is not reachable; sample history is shown.',
        };
      }
    }, 'reports-history',
  );

  if (loading || error || !reports) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">Generated Reports</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }
  const normalizedReports = reports.map(report => ({
    ...report,
    type: report.type || report.reportType,
    period: report.period || `${report.dateFrom || ''} - ${report.dateTo || ''}`,
  }));

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
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

        {normalizedReports.length ? <GeneratedReportTable reports={normalizedReports} onView={id => navigate(`/staff/reports/${encodeURIComponent(id)}`)} /> : <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No reports have been generated yet.</p>}

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>Showing {normalizedReports.length ? 1 : 0}–{normalizedReports.length} of {normalizedReports.length} reports</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1">Previous</button>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
