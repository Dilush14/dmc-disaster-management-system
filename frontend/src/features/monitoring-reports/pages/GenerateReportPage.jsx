import { useNavigate } from 'react-router-dom';
import { useReportGeneration } from '../context/ReportGenerationContext';
import ReportStepper from '../components/ReportStepper';
import ReportTypeCard from '../components/ReportTypeCard';

const REPORT_TYPES = [
  { title: 'Incident Summary Report', description: 'Overall disaster situation across all active districts.' },
  { title: 'District-Wide Report', description: 'District-specific monitoring and operational response updates.' },
  { title: 'Resource & Shelter Report', description: 'Capacity, occupancy and distribution across shelters and teams.' },
  { title: 'Custom Report', description: 'Tailored section selection for a focused briefing.' },
];

export default function GenerateReportPage() {
  const navigate = useNavigate();
  const { reportConfig, updateReportConfig } = useReportGeneration();

  const handleNext = () => {
    const nextConfig = {
      ...reportConfig,
      reportType: reportConfig.reportType || 'Incident Summary Report',
    };
    updateReportConfig(nextConfig);
    navigate('/staff/reports/generate/configure');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Generate Statistical Report</h1>
        </div>
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
      </div>

      <ReportStepper steps={['Select Type', 'Configure', 'Preview', 'Generate']} currentStep={1} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map(type => (
          <ReportTypeCard
            key={type.title}
            title={type.title}
            description={type.description}
            selected={reportConfig.reportType === type.title}
            onSelect={() => updateReportConfig({ reportType: type.title })}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>From</span>
            <input type="date" value={reportConfig.dateFrom} onChange={event => updateReportConfig({ dateFrom: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>To</span>
            <input type="date" value={reportConfig.dateTo} onChange={event => updateReportConfig({ dateTo: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
          </label>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700">Select District(s)</label>
          <select value={reportConfig.district} onChange={event => updateReportConfig({ district: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option>All Districts</option>
            <option>Colombo</option>
            <option>Gampaha</option>
            <option>Kandy</option>
            <option>Matara</option>
            <option>Kurunegala</option>
            <option>Jaffna</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700">Cancel</button>
        <button type="button" onClick={handleNext} className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800">Next →</button>
      </div>
    </div>
  );
}
