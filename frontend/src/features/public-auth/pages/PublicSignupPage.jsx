import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserRound, Users, Mail, Phone, LockKeyhole } from 'lucide-react';
import FormInput from '../../../components/auth/FormInput';
import { MobileHeader, MobilePrimaryButton } from '../../hazard-report/components/MobileUI';
import { usePublicAuth } from '../components/PublicAuthProvider';
import { validatePublicSignup } from '../services/validation';
import { publicAuthError } from '../services/publicAuthService';
export default function PublicSignupPage() {
  const { user, login } = usePublicAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/public/home" replace/>;
  async function submit(event) {
    event.preventDefault();
    const values = { ...Object.fromEntries(new FormData(event.currentTarget)), role };
    const next = validatePublicSignup(values); setErrors(next); setMessage('');
    if (Object.keys(next).length) { event.currentTarget.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus(); return; }
    setBusy(true);
    try { await login(values, true); navigate('/public/home', { replace: true }); }
    catch (error) { setMessage(publicAuthError(error)); }
    finally { setBusy(false); }
  }
  return <div className="mobile-page public-signup"><MobileHeader title="Create Account" subtitle="Join as a citizen or community volunteer to report hazards." back="/public"/><form noValidate onSubmit={submit}><FormInput label="Full Name" name="name" icon={UserRound} placeholder="Enter your full name" autoComplete="name" error={errors.name}/><FormInput label="Email" name="email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" error={errors.email}/><FormInput label="Phone Number" name="phone" icon={Phone} type="tel" placeholder="Enter your phone number" autoComplete="tel" error={errors.phone}/><FormInput label="Password" name="password" icon={LockKeyhole} type="password" placeholder="Create a password" autoComplete="new-password" error={errors.password}/><FormInput label="Confirm Password" name="confirm" icon={LockKeyhole} type="password" placeholder="Confirm password" autoComplete="new-password" error={errors.confirm}/><fieldset className="account-types" aria-describedby={errors.role ? 'role-error' : undefined}><legend>Account Type</legend><div>{[['CITIZEN', 'Citizen', 'Report hazards in your area', UserRound], ['COMMUNITY_VOLUNTEER', 'Community Volunteer', 'Support disaster response', Users]].map(([value, label, text, Icon]) => <label className={role === value ? 'selected' : ''} key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)}/><Icon size={29}/><strong>{label}</strong><span>{text}</span></label>)}</div>{errors.role && <p id="role-error" className="mobile-error">{errors.role}</p>}</fieldset><MobilePrimaryButton disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</MobilePrimaryButton></form>{message && <p className="mobile-error" role="alert">{message}</p>}<p className="mobile-auth-switch">Already have an account? <Link to="/public/login">Login</Link></p></div>;
}
