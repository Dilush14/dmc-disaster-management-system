import { useState } from 'react';
import { UserRound, BriefcaseBusiness, Mail, LockKeyhole, UserPlus, ArrowRight } from 'lucide-react';
import FormInput from './FormInput';
import { roles } from '../../constants/portal';
import { validateSignup } from '../../utils/validation';
export default function SignupForm({ onSwitch }) {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  function submit(event) {
    event.preventDefault();
    const next = validateSignup(Object.fromEntries(new FormData(event.currentTarget)));
    setErrors(next); setMessage(Object.keys(next).length ? '' : 'Your details are valid. Account creation will be available in a future release.');
    if (Object.keys(next).length) event.currentTarget.elements[Object.keys(next)[0]].focus();
  }
  return <><h2>Create Account</h2><p className="form-description">Join the DMC community to access alerts, reports and coordination tools.</p><form noValidate onSubmit={submit}><FormInput label="Full Name" name="name" icon={UserRound} placeholder="Enter your full name" autoComplete="name" error={errors.name}/><FormInput label="Role" name="role" icon={BriefcaseBusiness} defaultValue="" error={errors.role}><option value="" disabled>Select your role</option>{roles.map(role => <option key={role}>{role}</option>)}</FormInput><FormInput label="Email Address" name="email" icon={Mail} type="email" placeholder="name@domain.com" autoComplete="email" error={errors.email}/><FormInput label="Password" name="password" icon={LockKeyhole} type="password" placeholder="Create a password" autoComplete="new-password" error={errors.password}/><FormInput label="Confirm Password" name="confirm" icon={LockKeyhole} type="password" placeholder="Confirm your password" autoComplete="new-password" error={errors.confirm}/><button className="primary red" type="submit"><UserPlus size={22}/>Create Account</button></form><p className="switch-prompt">Already have an account? <button onClick={onSwitch}>Login <ArrowRight size={19}/></button></p><p role="status" className="form-status">{message}</p></>;
}
