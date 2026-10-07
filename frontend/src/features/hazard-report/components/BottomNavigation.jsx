import { House, ClipboardList, Info, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
const items = [[House, 'Home', '/public/home'], [ClipboardList, 'My Reports', '/public/my-reports'], [Info, 'Info', '/public/info'], [UserRound, 'Profile', '/public/profile']];
export default function BottomNavigation() {
  return <nav className="mobile-bottom-nav" aria-label="Public navigation">{items.map(([Icon, label, to]) => <NavLink key={to} to={to}><Icon size={22}/><span>{label}</span></NavLink>)}</nav>;
}
