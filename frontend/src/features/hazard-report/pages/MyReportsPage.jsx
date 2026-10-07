import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { MobileHeader, EmptyState } from '../components/MobileUI';
import ReportStatusBadge from '../components/ReportStatusBadge';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
import { getMyReports } from '../services/hazardReportService';
import ReportPhoto from '../components/ReportPhoto';
import { hazardLabel } from '../data/catalog';
import { formatReportDate } from '../utils/reportValidation';
export default function MyReportsPage() {
  const { user } = usePublicAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  useEffect(() => {
    let active = true;
    getMyReports(user).then(data => { if (active) setReports(data); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);
  const visible = reports.filter(report => filter === 'ALL' || report.status === filter);
  return <div className="mobile-page"><MobileHeader title="My Reports"/><div className="report-filters" aria-label="Filter reports">{[['ALL', 'All'], ['PENDING_VERIFICATION', 'Pending'], ['VERIFIED', 'Verified'], ['REJECTED', 'Rejected']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>{loading && <p role="status">Loading reports…</p>}{error && <p role="alert" className="mobile-error">{error}</p>}<div className="report-list">{visible.map(report => <Link className="public-report-card" key={report.reportId} to={`/public/my-reports/${report.reportId}`}>{report.photoUrl ? <ReportPhoto src={report.photoUrl} alt={`${hazardLabel(report.hazardType)} report thumbnail`}/> : <span className="report-thumbnail"><ClipboardList size={26}/></span>}<div><strong>{report.reportId}</strong><span>{hazardLabel(report.hazardType)}</span><small>{formatReportDate(report.submittedAt)}</small></div><div className="report-card-status"><ReportStatusBadge status={report.status}/><ChevronRight size={18}/></div></Link>)}</div>{!loading && !error && !visible.length && <EmptyState title={filter === 'ALL' ? 'No reports yet' : 'No matching reports'} to="/public/report-hazard" action="Report a hazard">Your submitted reports and their status will appear here.</EmptyState>}</div>;
}
