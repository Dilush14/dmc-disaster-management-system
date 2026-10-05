import HeroSection from '../../components/layout/HeroSection';
import AuthContainer from '../../components/auth/AuthContainer';
export default function AuthPage({ onInfo }) { return <main id="main" className="portal-main"><HeroSection onInfo={onInfo}/><AuthContainer/></main>; }
