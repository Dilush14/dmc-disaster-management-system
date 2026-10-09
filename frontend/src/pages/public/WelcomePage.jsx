import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, ShieldCheck } from 'lucide-react';
import HeroSection from '../../components/layout/HeroSection';
import { baseUrl } from '../../services/api/client';
export default function WelcomePage({ onInfo }) {
  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    fetch(`${baseUrl}/api/announcements`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Announcements unavailable')))
      .then(result => setAnnouncements(result.items || []))
      .catch(() => setAnnouncements([]));
  }, []);
  return <main id="main" className="portal-main welcome-page">
    <HeroSection welcome onInfo={onInfo}/>
    {announcements.length > 0 && <section className="welcome-announcements" aria-label="Current DMC announcements">
      <div className="welcome-announcements-heading"><Bell size={20}/><h2>Current DMC announcements</h2></div>
      {announcements.map(announcement => <article key={announcement.id}>
        <strong>{announcement.title}</strong>
        <span>{announcement.message}</span>
        <small>{announcement.affectedAreas?.join(', ') || 'Sri Lanka'} · Valid until {new Date(announcement.validUntil).toLocaleString()}</small>
      </article>)}
    </section>}
    <aside className="welcome-card">
      <ShieldCheck size={44}/>
      <p className="eyebrow">TOGETHER, WE ARE STRONGER</p>
      <h2>Prepared communities.<br/>Safer tomorrows.</h2>
      <p>Connect with the tools and people working towards a more resilient Sri Lanka.</p>
      <Link className="primary red" to="/auth">Get Started <ArrowRight size={20}/>
      </Link>
      <span>One community. One shared responsibility.</span>
    </aside>
  </main>;
}
