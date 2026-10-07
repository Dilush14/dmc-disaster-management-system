import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { authenticatedRequest } from '../../../services/api/authenticatedClient';
export default function ReportPhoto({ src, alt, className = '' }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setUrl(''); setFailed(false);
    if (!src?.startsWith('/api/public/hazard-reports/')) { setFailed(true); return; }
    authenticatedRequest(src, { signal: controller.signal }, { binary: true }).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(error => { if (error.name !== 'AbortError') setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (failed) return <span className={`report-photo-unavailable ${className}`} role="img" aria-label="Photo unavailable"><ImageOff size={22}/></span>;
  if (!url) return <span className={`report-photo-loading ${className}`} aria-label="Loading photo"/>;
  return <img src={url} alt={alt} className={className}/>;
}
