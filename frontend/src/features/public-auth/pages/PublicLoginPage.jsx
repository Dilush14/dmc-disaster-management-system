import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole } from 'lucide-react';
import FormInput from '../../../components/auth/FormInput';
import { MobileHeader, MobilePrimaryButton } from '../../hazard-report/components/MobileUI';
import { usePublicAuth } from '../components/PublicAuthProvider';
import { validatePublicLogin } from '../services/validation';
import { publicAuthError, requestPasswordReset } from '../services/publicAuthService';
export default function PublicLoginPage() {
  const { login, user, error: sessionError } = usePublicAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  if (user)
    return <Navigate to="/public/home" replace/>;
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const next = validatePublicLogin(values);
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) {
      event.currentTarget.elements[Object.keys(next)[0]].focus();
      return;
    }
    setBusy(true);
    try {
      await login(values);
      const from = location.state?.from;
      navigate(from?.startsWith('/public/') ? from : '/public/home', { replace: true });
    }
    catch (error) {
      setMessage(publicAuthError(error));
    }
    finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      setMessage(await requestPasswordReset(email));
    }
    catch (error) {
      setMessage(publicAuthError(error));
    }
    finally {
      setBusy(false);
    }
  }
  return <div className="mobile-page public-login">
    <MobileHeader
      title="Welcome Back"
      subtitle="Login to report hazards and track your submissions."
      back="/public"
    />
    <form noValidate onSubmit={submit}>
      <FormInput
        label="Email"
        name="email"
        icon={Mail}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={errors.email}
      />
      <FormInput
        label="Password"
        name="password"
        icon={LockKeyhole}
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password}
      />
      <div className="mobile-form-options">
        <label>
          <input name="remember" type="checkbox"/>Remember me</label>
        <button type="button" onClick={reset} disabled={busy}>Forgot password?</button>
      </div>
      <MobilePrimaryButton disabled={busy}>{busy ? 'Please wait…' : 'Login'}</MobilePrimaryButton>
    </form>
    {(message || sessionError) && <p className="mobile-feedback" role="status">{message || sessionError}</p>}
    <p className="mobile-auth-switch">Don’t have an account? <Link to="/public/signup">Create Account</Link>
    </p>
  </div>;
}
