import { BellRing, Users, ShieldCheck, FileText } from 'lucide-react';
export default function AuthVisualPanel({ signup }) {
  const items = signup ? [[BellRing, 'Receive real-time alerts and situation reports'], [Users, 'Collaborate with response teams and agencies'], [ShieldCheck, 'Help build safer communities across Sri Lanka']] : [[Users, 'Access real-time alerts and situation reports'], [FileText, 'Coordinate response and manage resources'], [ShieldCheck, 'Support safer communities across Sri Lanka']];
  return <aside className="auth-visual"><div className="visual-content" key={String(signup)}><h2>{signup ? 'Join the DMC Community' : 'Welcome Back'}</h2><p>{signup ? 'Be part of a safer and more resilient Sri Lanka.' : 'Together for a Safer and More Resilient Sri Lanka.'}</p><ul>{items.map(([Icon, text]) => <li key={text}><span><Icon size={23}/></span>{text}</li>)}</ul></div><div className="visual-indicators" aria-hidden="true"><i/><i/><i/></div></aside>;
}
