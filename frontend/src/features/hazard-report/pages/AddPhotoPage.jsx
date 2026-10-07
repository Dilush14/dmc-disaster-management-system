import { Navigate, useNavigate } from 'react-router-dom';
import { MobileHeader, MobilePrimaryButton } from '../components/MobileUI';
import PhotoUploader from '../components/PhotoUploader';
import { useHazardReport } from '../context/HazardReportContext';
import { validateReport } from '../utils/reportValidation';
export default function AddPhotoPage() {
  const { reportData, updateReportData } = useHazardReport();
  const navigate = useNavigate();
  if (!reportData.hazardType) return <Navigate to="/public/report-hazard" replace/>;
  if (Object.keys(validateReport(reportData)).length) return <Navigate to="/public/report-hazard/details" replace/>;
  return <div className="mobile-page"><MobileHeader title="Add Photo" subtitle="Upload a clear photo of the hazard. This helps the DMC verify the report." back="/public/report-hazard/details" step={3}/><PhotoUploader photo={reportData.photo} preview={reportData.photoPreview} onChange={(photo, photoPreview) => updateReportData({ photo, photoPreview })}/><div className="mobile-page-actions"><MobilePrimaryButton onClick={() => navigate('/public/report-hazard/review')}>Next</MobilePrimaryButton></div></div>;
}
