import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export default function FormInput({ label, name, icon: Icon, error, type = 'text', children, ...props }) {
  const [visible, setVisible] = useState(false);
  const id = `auth-${name}`;
  const accessibility = { id, name, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined, ...props };
  return <div className="form-field"><label htmlFor={id}>{label}</label><div className={`input-wrap ${error ? 'invalid' : ''}`}><Icon size={19}/>{children ? <select {...accessibility}>{children}</select> : <input {...accessibility} type={type === 'password' && visible ? 'text' : type}/>}{type === 'password' && <button type="button" className="password-toggle" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>}</div>{error && <p id={`${id}-error`} className="field-error">{error}</p>}</div>;
}
