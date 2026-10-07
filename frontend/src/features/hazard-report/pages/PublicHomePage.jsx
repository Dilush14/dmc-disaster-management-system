import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, ClipboardList, Info, Phone, TriangleAlert, Umbrella, UserRound } from 'lucide-react';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
import { useHazardReport } from '../context/HazardReportContext';
export default function PublicHomePage() {
  const { user } = usePublicAuth();
  const { resetReport } = useHazardReport();
  const [notice, setNotice] = useState(false);
  return <div className="mobile-page public-home"><header className="public-greeting"><span className="public-avatar"><UserRound size={25}/></span><div><span>Hello,</span><h1>{user.name}</h1></div><button className="mobile-icon-button" aria-label="View announcements" aria-expanded={notice} onClick={() => setNotice(!notice)}><Bell size={22}/><i/></button></header>{notice && <p className="mobile-feedback" role="status">You have no new notifications.</p>}<section className="public-home-banner"><h2>Report hazards<br/>for a safer community</h2><Link to="/public/report-hazard" onClick={resetReport}>Report a Hazard <ArrowRight size={17}/></Link></section><div className="public-quick-actions">{[[TriangleAlert, 'Report Hazard', '/public/report-hazard', 'red'], [ClipboardList, 'My Reports', '/public/my-reports', 'blue'], [Info, 'Disaster Info', '/public/info', 'green'], [Phone, 'Emergency Contacts', '/public/contacts', 'amber']].map(([Icon, label, path, tone]) => <Link key={path} to={path} onClick={label === 'Report Hazard' ? resetReport : undefined}><span className={`quick-icon tone-${tone}`}><Icon size={30}/></span><strong>{label}</strong></Link>)}</div><section className="mobile-section announcements"><div className="section-heading"><h2>Recent Announcements</h2></div><p className="mobile-hint">For current warnings and announcements, visit the <a href="https://www.dmc.gov.lk/" target="_blank" rel="noreferrer">official DMC website</a>.</p></section></div>;
}
