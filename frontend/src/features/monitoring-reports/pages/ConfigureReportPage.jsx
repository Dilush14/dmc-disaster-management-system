import { useNavigate } from 'react-router-dom';
import { useReportGeneration } from '../context/ReportGenerationContext';
import ReportSectionSelector from '../components/ReportSectionSelector';
import ReportStepper from '../components/ReportStepper';
import { reportSectionOptions } from '../data/monitoringMockData';

export default function ConfigureReportPage() {
  const navigate = useNavigate();
  const { reportConfig, updateReportConfig } = useReportGeneration();

  const toggleSection = section => {
    const current = reportConfig.selectedSections || [];
    const next = current.includes(section)
      ? current.filter(item => item !== section)
      : [...current, section];
    updateReportConfig({ selectedSections: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Configure Report Content</h1>
        </div>
      </div>

      <ReportStepper steps={['Select Type', 'Configure', 'Preview', 'Generate']} currentStep={2} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Report Sections</h3>
          <ReportSectionSelector sections={reportSectionOptions} selected={reportConfig.selectedSections} onToggle={toggleSection} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Additional Options</h3>
          <div className="space-y-4 text-sm text-slate-700">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Report Format</span>
              <select value={reportConfig.reportFormat} onChange={event => updateReportConfig({ reportFormat: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                <option>PDF</option>
                <option>HTML</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Include Charts & Graphs</span>
              <input type="checkbox" checked={reportConfig.includeCharts} onChange={event => updateReportConfig({ includeCharts: event.target.checked })} className="h-4 w-4 accent-blue-600" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Include Maps</span>
              <input type="checkbox" checked={reportConfig.includeMaps} onChange={event => updateReportConfig({ includeMaps: event.target.checked })} className="h-4 w-4 accent-blue-600" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Include Raw Data Tables</span>
              <input type="checkbox" checked={reportConfig.includeRawData} onChange={event => updateReportConfig({ includeRawData: event.target.checked })} className="h-4 w-4 accent-blue-600" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Include Annex / Appendix</span>
              <input type="checkbox" checked={reportConfig.includeAppendix} onChange={event => updateReportConfig({ includeAppendix: event.target.checked })} className="h-4 w-4 accent-blue-600" />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => navigate('/staff/reports/generate')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700">← Back</button>
        <button type="button" onClick={() => navigate('/staff/reports/generate/preview')} className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800">Next →</button>
      </div>
    </div>
  );
}
