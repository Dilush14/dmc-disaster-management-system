import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { features } from '../../constants/portal';
export default function HeroSection({ welcome, onInfo }) {
  return <section className="hero-copy"><p className="eyebrow">SAFER COMMUNITIES <span>•</span> STRONGER SRI LANKA</p><h1>Welcome to the<br/><em>Disaster Management</em><br/>Center Portal</h1><p className="hero-description">A unified platform for hazard warning, incident reporting, shelter management and response coordination across Sri Lanka.</p>{welcome && <Link className="primary hero-cta" to="/auth">Sign In to the Portal <ArrowRight size={20}/></Link>}<div className="red-rule"/><div className="feature-shortcuts">{features.map(({ name, icon: Icon }) => <button key={name} onClick={() => onInfo(name)}><Icon size={32}/><span>{name}</span></button>)}</div></section>;
}
