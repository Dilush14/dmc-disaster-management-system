import { Link } from 'react-router-dom';
import { PublicBrand, PrimaryLink } from '../components/MobileUI';
export default function PublicWelcomePage() {
  return <div className="mobile-page public-welcome">
    <PublicBrand/>
    <div className="public-welcome-image">
      <img src="/images/dmc-flood-rescue.png" alt="Illustrative flood rescue scene"/>
      <span>TOGETHER FOR A SAFER SRI LANKA</span>
    </div>
    <section className="welcome-message">
      <h2>Report hazards</h2>
      <p>Help keep your community safe.</p>
      <div className="welcome-dots" aria-hidden="true">
        <i/>
        <i/>
        <i/>
      </div>
    </section>
    <div className="welcome-bottom">
      <PrimaryLink to="/public/signup">Get Started</PrimaryLink>
      <p className="mobile-auth-switch">Already have an account? <Link to="/public/login">Login</Link>
      </p>
    </div>
  </div>;
}
