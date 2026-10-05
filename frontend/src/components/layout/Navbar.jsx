import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Globe, Menu, X, ShieldPlus } from 'lucide-react';
export function Brand() {
  return <Link className="brand" to="/" aria-label="DMC home"><span className="brand-mark"><ShieldPlus size={38} strokeWidth={2.5}/></span><span><strong>DMC</strong><small>Disaster Management Center<br/>SRI LANKA</small></span></Link>;
}
export default function Navbar({ onInfo }) {
  const [open, setOpen] = useState(false);
  return <header className="navbar"><Brand/><button className="mobile-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation"><NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>{['About', 'Hazard Information', 'Reports', 'Resources', 'Contact'].map(label => <button key={label} onClick={() => { onInfo(label); setOpen(false); }}>{label}</button>)}</nav><label className="language"><Globe size={18}/><select aria-label="Language" defaultValue="en"><option value="en">English</option><option disabled>Sinhala — coming soon</option><option disabled>Tamil — coming soon</option></select></label></header>;
}
