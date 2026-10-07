import { ArrowLeft, ArrowRight, MapPin, MountainSnow, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
export function MobileHeader({ title, subtitle, back = '/public/home', step }) {
  return <header className="mobile-header">
    <div className="mobile-topline">
      <Link className="mobile-icon-button" to={back} aria-label="Go back">
        <ArrowLeft size={21}/>
      </Link>
      {step && <span className="mobile-step">STEP {step} OF 4</span>}
    </div>
    <h1 tabIndex={-1}>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </header>;
}
export function MobilePrimaryButton({ children, className = '', ...props }) {
  return <button className={`mobile-primary ${className}`} {...props}>{children}</button>;
}
export function PrimaryLink({ to, children, secondary = false }) {
  return <Link to={to} className={secondary ? 'mobile-secondary' : 'mobile-primary'}>{children}</Link>;
}
export function FormSection({ title, children }) {
  return <section className="mobile-section">
    <h2>{title}</h2>
    {children}
  </section>;
}
export function LocationCard({ latitude, longitude }) {
  const valid = latitude !== '' && longitude !== '' && latitude != null && longitude != null;
  return <div className="location-card">
    <div className="map-placeholder" aria-label="Illustrative location panel; not a live map">
      <MapPin size={32}/>
      <span>Location preview</span>
    </div>
    <p>
      {valid ? <>Lat: {Number(latitude).toFixed(4)} <span>Lng: {Number(longitude).toFixed(4)}
        </span>
      </> : 'Choose your location below'}
    </p>
    <small>Illustrative map • coordinates shown as entered</small>
  </div>;
}
export function PublicBrand() {
  return <div className="public-brand">
    <div className="public-brand-icon">
      <MountainSnow size={75} strokeWidth={1.6}/>
      <ShieldCheck size={23}/>
    </div>
    <strong>DMC</strong>
    <h1>Disaster Management Centre</h1>
    <p>Safer Communities, Stronger Sri Lanka</p>
  </div>;
}
export function EmptyState({ title, children, to, action }) {
  return <section className="mobile-empty">
    <ShieldCheck size={38}/>
    <h2>{title}</h2>
    <p>{children}</p>
    {to && <Link to={to} className="mobile-text-link">
      {action} <ArrowRight size={17}/>
    </Link>}
  </section>;
}
