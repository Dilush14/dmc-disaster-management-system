import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, LogIn, ArrowRight } from 'lucide-react';
import FormInput from './FormInput';
import { validateLogin } from '../../utils/validation';
import { publicAuthError, requestPasswordReset } from '../../features/public-auth/services/publicAuthService';
import { loginStaff } from '../../services/firebase/staffAuthService';
export default function LoginForm({ onSwitch }) {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const next = validateLogin(values);
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) {
      event.currentTarget.elements[Object.keys(next)[0]].focus();
      return;
    }
    setBusy(true);
    try {
      await loginStaff(values);
      navigate('/staff/monitoring', { replace: true });
    } catch (error) {
      setMessage(publicAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setBusy(true);
    try {
      setMessage(await requestPasswordReset(formRef.current.elements.identity.value));
    } catch (error) {
      setMessage(publicAuthError(error));
    } finally {
      setBusy(false);
    }
  }
  return <>
    <h2>Sign In</h2>
    <p className="form-description">Access your DMC account to view alerts, reports and coordination tools.</p>
    <form ref={formRef} noValidate onSubmit={submit} aria-busy={busy}>
      <FormInput
        label="Email Address"
        name="identity"
        type="email"
        icon={Mail}
        placeholder="name@domain.com"
        autoComplete="username"
        error={errors.identity}
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
      <div className="form-options">
        <label>
          <input type="checkbox" name="remember" defaultChecked/> Remember me</label>
        <button
          type="button"
          className="text-link"
          onClick={resetPassword}
          disabled={busy}
        >Forgot password?</button>
      </div>
      <button className="primary" type="submit" disabled={busy}>
        <LogIn size={22}/>{busy ? 'Please wait…' : 'Sign In'}</button>
    </form>
    <div className="divider">
      <span>or continue with</span>
    </div>
    <div className="social-buttons">
      <button onClick={() => setMessage('Google sign-in will be available in a future release.')}>
        <span className="google-mark">G</span> Google</button>
      <button onClick={() => setMessage('Microsoft sign-in will be available in a future release.')}>
        <span className="microsoft-mark"/> Microsoft</button>
    </div>
    <p className="switch-prompt">Don’t have an account? <button onClick={onSwitch}>Register <ArrowRight size={19}/>
      </button>
    </p>
    <p role="status" className="form-status">{message}</p>
  </>;
}
