import { useState } from 'react';
import { Mail, LockKeyhole, LogIn, ArrowRight } from 'lucide-react';
import FormInput from './FormInput';
import { validateLogin } from '../../utils/validation';
export default function LoginForm({ onSwitch }) {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  function submit(event) {
    event.preventDefault();
    const next = validateLogin(Object.fromEntries(new FormData(event.currentTarget)));
    setErrors(next); setMessage(Object.keys(next).length ? '' : 'Your details are valid. Sign-in will be available when authentication is connected.');
    if (Object.keys(next).length) event.currentTarget.elements[Object.keys(next)[0]].focus();
  }
  return <><h2>Sign In</h2><p className="form-description">Access your DMC account to view alerts, reports and coordination tools.</p><form noValidate onSubmit={submit}><FormInput label="Email or Username" name="identity" icon={Mail} placeholder="name@domain.com" autoComplete="username" error={errors.identity}/><FormInput label="Password" name="password" icon={LockKeyhole} type="password" placeholder="Enter your password" autoComplete="current-password" error={errors.password}/><div className="form-options"><label><input type="checkbox" name="remember" defaultChecked/> Remember me</label><button type="button" className="text-link" onClick={() => setMessage('Password recovery will be available when authentication is connected.')}>Forgot password?</button></div><button className="primary" type="submit"><LogIn size={22}/>Sign In</button></form><div className="divider"><span>or continue with</span></div><div className="social-buttons"><button onClick={() => setMessage('Google sign-in will be available in a future release.')}><span className="google-mark">G</span> Google</button><button onClick={() => setMessage('Microsoft sign-in will be available in a future release.')}><span className="microsoft-mark"/> Microsoft</button></div><p className="switch-prompt">Don’t have an account? <button onClick={onSwitch}>Register <ArrowRight size={19}/></button></p><p role="status" className="form-status">{message}</p></>;
}
