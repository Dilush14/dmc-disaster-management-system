import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
import { getHazardReport } from '../services/hazardReportService';
import { MobileHeader, EmptyState } from '../components/MobileUI';
import ReportStatusBadge from '../components/ReportStatusBadge';
import ReportSummaryCard from '../components/ReportSummaryCard';
export default function ReportDetailPage() {
  const { id } = useParams();
  const { user } = usePublicAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(
    () => {
      let active = true;
      setLoading(true);
      getHazardReport(id, user)
      .then(data => {
        if (active)
          setReport(data);
      }).catch(
        failure => {
          if (active)
            setError(failure.message);
        }
      ).finally(
        () => {
          if (active)
            setLoading(false);
        }
      );
      return () => {
        active = false;
      };
    },
    [id, user]
  );
  return <div className="mobile-page">
    <MobileHeader title="Report Details" back="/public/my-reports"/>
    {loading ?
      <p role="status">Loading report…</p> :
      error ?
        <p className="mobile-error" role="alert">{error}</p> :
        !report ?
          <EmptyState title="Report not found" to="/public/my-reports" action="Back to My Reports">This report could not be found for your account.</EmptyState> :
          <>
            <div className="report-detail-title">
              <strong>{report.reportId}</strong>
              <ReportStatusBadge status={report.status}/>
            </div>
            <ReportSummaryCard report={report}/>
            {report.rejectionReason && <p className="mobile-feedback">{report.rejectionReason}</p>}
          </>}
  </div>;
}
