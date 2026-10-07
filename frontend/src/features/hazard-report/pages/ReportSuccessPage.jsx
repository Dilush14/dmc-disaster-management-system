import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useHazardReport } from '../context/HazardReportContext';
import { PrimaryLink } from '../components/MobileUI';
export default function ReportSuccessPage() {
  const { submittedReport, resetReport } = useHazardReport();
  const [message, setMessage] = useState('');
  // Reset only after leaving review, so its missing-draft guard cannot race navigation.
  useEffect(() => {
    if (submittedReport)
      resetReport();
  }, [submittedReport, resetReport]);
  if (!submittedReport)
    return <Navigate to="/public/my-reports" replace/>;
  async function copy() {
    try {
      await navigator.clipboard.writeText(submittedReport.reportId);
      setMessage('Report ID copied.');
    }
    catch {
      setMessage('Unable to copy. You can select the report ID above.');
    }
  }
  return <div className="mobile-page report-success">
    <div className="success-symbol">
      <Check size={53} strokeWidth={3}/>
    </div>
    <h1>Report Submitted<br/>Successfully!</h1>
    <p>Thank you for helping keep your community safe. Your report is now pending verification.</p>
    <div className="success-report-id">
      <div>
        <span>Report ID</span>
        <strong>{submittedReport.reportId}</strong>
      </div>
      <button aria-label="Copy report ID" onClick={copy}>
        <Copy size={20}/>
      </button>
    </div>
    {message && <p role="status">{message}</p>}
    <PrimaryLink to={`/public/my-reports/${submittedReport.reportId}`}>View Report Status</PrimaryLink>
    <PrimaryLink to="/public/home" secondary>Back to Home</PrimaryLink>
  </div>;
}
