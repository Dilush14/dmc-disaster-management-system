import { useNavigate } from 'react-router-dom';
import { MobileHeader, MobilePrimaryButton } from '../components/MobileUI';
import HazardTypeCard from '../components/HazardTypeCard';
import { hazards } from '../data/catalog';
import { useHazardReport } from '../context/HazardReportContext';
export default function SelectHazardTypePage() {
  const { reportData, updateReportData } = useHazardReport();
  const navigate = useNavigate();
  return <div className="mobile-page"><MobileHeader title="Select Hazard Type" subtitle="Choose the type of hazard you want to report." step={1}/><fieldset className="hazard-types"><legend className="sr-only">Hazard type</legend>{hazards.map(hazard => <HazardTypeCard key={hazard.value} hazard={hazard} selected={reportData.hazardType === hazard.value} onSelect={hazardType => updateReportData({ hazardType })}/>)}</fieldset><div className="mobile-page-actions"><MobilePrimaryButton disabled={!reportData.hazardType} onClick={() => navigate('/public/report-hazard/details')}>Next</MobilePrimaryButton></div></div>;
}
