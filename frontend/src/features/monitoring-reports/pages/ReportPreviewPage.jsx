import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportGeneration } from '../context/ReportGenerationContext';
import ReportPreview from '../components/ReportPreview';
import ReportStepper from '../components/ReportStepper';
import { reportService } from '../services/reportService';

export default function ReportPreviewPage() {
  const navigate = useNavigate();
  const { reportConfig, generateReportForConfig } = useReportGeneration();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    reportService.previewReport(reportConfig).then(data => {
      if (active) setReport(data);
    }).catch(previewError => {
      if (active) setError(previewError.message || 'Unable to load a live report preview.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reportConfig]);

  const handleGenerate = async () => {
    await generateReportForConfig(reportConfig);
    navigate('/staff/reports/generate/progress');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Report Preview</h1>
        </div>
      </div>

      <ReportStepper steps={['Select Type', 'Configure', 'Preview', 'Generate']} currentStep={3} />
      {loading && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Loading preview from live operational data…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {report && <ReportPreview config={reportConfig} report={report} />}

      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => navigate('/staff/reports/generate/configure')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700">← Back</button>
        <button type="button" disabled={loading || Boolean(error)} onClick={handleGenerate} className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Generate Report</button>
      </div>
    </div>
  );
}
