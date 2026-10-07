import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportGeneration } from '../context/ReportGenerationContext';
import GenerationProgress from '../components/GenerationProgress';

const generationSteps = [
  'Compiling incident data',
  'Processing district statistics',
  'Generating charts and maps',
  'Creating PDF document',
  'Finalizing report',
];

export default function ReportGenerationPage() {
  const navigate = useNavigate();
  const { reportResult, error } = useReportGeneration();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress(current => {
        const next = Math.min(current + 18, 100);
        if (next >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100 && reportResult) {
      const timer = window.setTimeout(() => {
        navigate(`/staff/reports/${reportResult.id}`);
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, [progress, reportResult, navigate]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Report Generation Failed</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
          <p className="font-semibold">{error}</p>
          <p className="mt-2 text-sm">Possible causes include incomplete report data, missing shelter occupancy records, missing resource-distribution information, or a temporary system failure.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/staff/reports/generate/configure')} className="rounded-xl bg-blue-700 px-4 py-2 text-white">Back to Configuration</button>
          <button type="button" onClick={() => navigate('/staff/reports/generate')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Generating Report...</h1>
      </div>
      <GenerationProgress progress={progress} steps={generationSteps} />
    </div>
  );
}
