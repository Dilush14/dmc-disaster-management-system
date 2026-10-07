import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserRound, UserPlus } from 'lucide-react';
import AuthVisualPanel from './AuthVisualPanel';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
export default function AuthContainer() {
  const [params, setParams] = useSearchParams();
  const signup = params.get('mode') === 'signup';
  const [displaySignup, setDisplaySignup] = useState(signup);
  const [changing, setChanging] = useState(false);
  const formRef = useRef(null);
  useEffect(
    () => {
      if (signup === displaySignup) {
        setChanging(false);
        return;
      }
      setChanging(true);
      const timer = setTimeout(() => {
        setDisplaySignup(signup);
        setChanging(false);
        formRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    },
    [signup, displaySignup]
  );
  function switchMode(next) {
    setParams(next ? { mode: 'signup' } : {}, { replace: true });
  }
  return <section className={`auth-card ${signup ? 'signup' : ''}`} aria-label="Account access">
    <AuthVisualPanel signup={signup}/>
    <div className="auth-form-panel">
      <div className="auth-tabs" aria-label="Authentication mode">
        <button
          aria-pressed={!signup}
          className={!signup ? 'selected' : ''}
          onClick={() => switchMode(false)}
        >
          <UserRound size={20}/>Login</button>
        <button aria-pressed={signup} className={signup ? 'selected' : ''} onClick={() => switchMode(true)}>
          <UserPlus size={20}/>Sign Up</button>
      </div>
      <div
        ref={formRef}
        tabIndex={-1}
        className={`form-content ${displaySignup ? 'signup-content' : ''} ${changing ? 'changing' : ''}`}
      >
        {displaySignup ? <SignupForm onSwitch={() => switchMode(false)}/> : <LoginForm onSwitch={() => switchMode(true)}/>}
      </div>
    </div>
  </section>;
}
