import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MobileHeader, MobilePrimaryButton } from '../components/MobileUI';
import ReportSummaryCard from '../components/ReportSummaryCard';
import { useHazardReport } from '../context/HazardReportContext';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
import { submitHazardReport } from '../services/hazardReportService';
import { validateReport } from '../utils/reportValidation';
export default function ReviewHazardReportPage() {
  const { reportData, setSubmittedReport } = useHazardReport();
  const { user } = usePublicAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const navigate = useNavigate();
  if (!reportData.hazardType)
    return <Navigate to="/public/report-hazard" replace/>;
  if (Object.keys(validateReport(reportData)).length)
    return <Navigate to="/public/report-hazard/details" replace/>;
  async function submit() {
    if (submitting.current)
      return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await submitHazardReport(reportData, user);
      setSubmittedReport(result);
      navigate('/public/report-hazard/success', { replace: true });
    }
    catch (failure) {
      setError(failure.message || 'Unable to submit. Please try again.');
    }
    finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return <div className="mobile-page">
    <MobileHeader
      title="Review Report"
      subtitle="Please review your information before submitting."
      back="/public/report-hazard/photo"
      step={4}
    />
    <ReportSummaryCard report={reportData} editable/>
    {error && <p className="mobile-error" role="alert">{error}</p>}
    <MobilePrimaryButton disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit Report'}</MobilePrimaryButton>
  </div>;
}
