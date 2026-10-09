import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, ClipboardList, Info, Phone, TriangleAlert, Umbrella, UserRound } from 'lucide-react';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
import { useHazardReport } from '../context/HazardReportContext';
import { getPublicWarnings } from '../../public-auth/services/publicAuthService';
export default function PublicHomePage() {
  const { user } = usePublicAuth();
  const { resetReport } = useHazardReport();
  const [notice, setNotice] = useState(false);
  const [warnings, setWarnings] = useState([]);
  useEffect(() => {
    getPublicWarnings().then(result => setWarnings(result.items || [])).catch(() => setWarnings([]));
  }, []);
  return <div className="mobile-page public-home">
    <header className="public-greeting">
      <span className="public-avatar">
        <UserRound size={25}/>
      </span>
      <div>
        <span>Hello,</span>
        <h1>{user.name}</h1>
      </div>
      <button
        className="mobile-icon-button"
        aria-label="View announcements"
        aria-expanded={notice}
        onClick={() => setNotice(!notice)}
      >
        <Bell size={22}/>
        <i/>
      </button>
    </header>
    {notice && <div className="mobile-feedback" role="status">{warnings.length ? warnings.map(warning => <p key={warning.id}><strong>{warning.title}</strong>: {warning.message}</p>) : <p>You have no new notifications.</p>}</div>}
    <section className="public-home-banner">
      <h2>Report hazards<br/>for a safer community</h2>
      <Link to="/public/report-hazard" onClick={resetReport}>Report a Hazard <ArrowRight size={17}/>
      </Link>
    </section>
    <div className="public-quick-actions">
      {[
        [TriangleAlert, 'Report Hazard', '/public/report-hazard', 'red'],
        [ClipboardList, 'My Reports', '/public/my-reports', 'blue'],
        [Info, 'Disaster Info', '/public/info', 'green'],
        [Phone, 'Emergency Contacts', '/public/contacts', 'amber']
      ].map(
        ([Icon, label, path, tone]) => <Link key={path} to={path} onClick={label === 'Report Hazard' ? resetReport : undefined}>
          <span className={`quick-icon tone-${tone}`}>
            <Icon size={30}/>
          </span>
          <strong>{label}</strong>
        </Link>
      )}
    </div>
    <section className="mobile-section announcements">
      <div className="section-heading">
        <h2>Recent Announcements</h2>
      </div>
      {warnings.length ? <div className="announcement-list">
        {warnings.map(warning => <article key={warning.id}>
          <div className="announcement-meta">
            <strong>{warning.severity} alert</strong>
            <small>{warning.affectedAreas?.join(', ') || 'Sri Lanka'}</small>
          </div>
          <h3>{warning.title}</h3>
          <p>{warning.message}</p>
          <small>Valid until {new Date(warning.validUntil).toLocaleString()}</small>
        </article>)}
      </div> : <p className="mobile-hint">There are no current website warnings.</p>}
    </section>
  </div>;
}
