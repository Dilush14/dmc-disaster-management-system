import { useNavigate } from 'react-router-dom';
import { useReportGeneration } from '../context/ReportGenerationContext';
import ReportPreview from '../components/ReportPreview';
import ReportStepper from '../components/ReportStepper';
import { generateReport } from '../utils/monitoringReports.js';

export default function ReportPreviewPage() {
  const navigate = useNavigate();
  const { reportConfig, generateReportForConfig } = useReportGeneration();

  const handleGenerate = async () => {
    await generateReportForConfig(reportConfig);
    navigate('/staff/reports/generate/progress');
  };

  const report = generateReport(reportConfig);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Report Preview</h1>
        </div>
      </div>

      <ReportStepper steps={['Select Type', 'Configure', 'Preview', 'Generate']} currentStep={3} />
      <ReportPreview config={reportConfig} report={report} />

      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => navigate('/staff/reports/generate/configure')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700">← Back</button>
        <button type="button" onClick={handleGenerate} className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800">Generate Report</button>
      </div>
    </div>
  );
}
