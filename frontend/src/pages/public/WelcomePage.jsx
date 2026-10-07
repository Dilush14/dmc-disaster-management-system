import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import HeroSection from '../../components/layout/HeroSection';
export default function WelcomePage({ onInfo }) {
  return <main id="main" className="portal-main welcome-page">
    <HeroSection welcome onInfo={onInfo}/>
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
