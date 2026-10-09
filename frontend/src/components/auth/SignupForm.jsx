import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, BriefcaseBusiness, Mail, Phone, LockKeyhole, UserPlus, ArrowRight } from 'lucide-react';
import FormInput from './FormInput';
import { registrationRoles, validateSignup } from '../../utils/validation';
import { publicAuthError } from '../../features/public-auth/services/publicAuthService';
import { registerStaff } from '../../services/firebase/staffAuthService';
export default function SignupForm({ onSwitch }) {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const next = validateSignup(values);
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) {
      event.currentTarget.elements[Object.keys(next)[0]].focus();
      return;
    }
    setBusy(true);
    try {
      await registerStaff(values);
      navigate('/staff/monitoring', { replace: true });
    } catch (error) {
      setMessage(publicAuthError(error));
    } finally {
      setBusy(false);
    }
  }
  return <>
    <h2>Create Account</h2>
    <p className="form-description">Join the DMC community to access alerts, reports and coordination tools.</p>
    <form noValidate onSubmit={submit} aria-busy={busy}>
      <FormInput
        label="Full Name"
        name="name"
        icon={UserRound}
        placeholder="Enter your full name"
        autoComplete="name"
        error={errors.name}
      />
      <FormInput label="Role" name="role" icon={BriefcaseBusiness} defaultValue="" error={errors.role}>
        <option value="" disabled>Select your role</option>
        {Object.keys(registrationRoles).map(role => <option key={role}>{role}</option>)}
      </FormInput>
      <FormInput
        label="Email Address"
        name="email"
        icon={Mail}
        type="email"
        placeholder="name@domain.com"
        autoComplete="email"
        error={errors.email}
      />
      <FormInput
        label="Phone Number"
        name="phone"
        icon={Phone}
        type="tel"
        placeholder="0771234567"
        autoComplete="tel"
        error={errors.phone}
      />
      <FormInput
        label="Password"
        name="password"
        icon={LockKeyhole}
        type="password"
        placeholder="Create a password"
        autoComplete="new-password"
        error={errors.password}
      />
      <FormInput
        label="Confirm Password"
        name="confirm"
        icon={LockKeyhole}
        type="password"
        placeholder="Confirm your password"
        autoComplete="new-password"
        error={errors.confirm}
      />
      <button className="primary red" type="submit" disabled={busy}>
        <UserPlus size={22}/>{busy ? 'Please wait…' : 'Create Account'}</button>
    </form>
    <p className="switch-prompt">Already have an account? <button onClick={onSwitch}>Login <ArrowRight size={19}/>
      </button>
    </p>
    <p role="status" className="form-status">{message}</p>
  </>;
}
