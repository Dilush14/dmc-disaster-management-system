import { TriangleAlert, Network, Users, ShieldCheck } from 'lucide-react';
export default function Footer({ onInfo }) {
  return <footer className="footer">
    <div>
      <TriangleAlert/>
      <span>Real-time<br/>Hazard Monitoring</span>
    </div>
    <div>
      <Network/>
      <span>Coordinated<br/>Emergency Response</span>
    </div>
    <div>
      <Users/>
      <span>Stronger<br/>Safer Communities</span>
    </div>
    <div className="footer-brand">
      <ShieldCheck/>
      <span>
        <strong>Disaster Management Center</strong>
        <br/>For a Safer and More Resilient Sri Lanka</span>
    </div>
    <nav aria-label="Footer">
      {['Privacy', 'Terms', 'Help', 'Contact'].map(x => <button key={x} onClick={() => onInfo(x)}>{x}</button>)}
    </nav>
  </footer>;
}
