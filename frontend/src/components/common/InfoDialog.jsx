import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function InfoDialog({ topic, onClose }) {
  const ref = useRef(null);
  useEffect(() => { if (topic) ref.current.showModal(); else ref.current.close(); }, [topic]);
  return <dialog ref={ref} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} className="info-dialog"><button className="dialog-close" aria-label="Close" onClick={onClose}><X/></button><h2>{topic}</h2><p>{topic === 'About' ? 'DMC is a university project exploring early warning and emergency coordination for safer communities across Sri Lanka.' : 'This area will be available in a future release. You can explore the welcome page and account forms now.'}</p><button className="primary" onClick={onClose}>Got it</button></dialog>;
}
