import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LocateFixed, MapPin } from 'lucide-react';
import { MobileHeader, MobilePrimaryButton, LocationCard } from '../components/MobileUI';
import { useHazardReport } from '../context/HazardReportContext';
import { localDateTime, validateReport } from '../utils/reportValidation';
export default function HazardDetailsPage() {
  const { reportData, updateReportData } = useHazardReport();
  const [errors, setErrors] = useState({});
  const [gps, setGps] = useState('');
  const [locating, setLocating] = useState(false);
  const [manual, setManual] = useState(false);
  const active = useRef(true);
  const request = useRef(0);
  const navigate = useNavigate();
  useEffect(() => { active.current = true; return () => { active.current = false; request.current++; }; }, []);
  if (!reportData.hazardType) return <Navigate to="/public/report-hazard" replace/>;
  function locate() {
    const id = ++request.current;
    const fail = () => { if (active.current && id === request.current) { setLocating(false); setGps('Unable to access your current location.'); } };
    setLocating(true); setGps('');
    if (!navigator.geolocation) { fail(); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (!active.current || id !== request.current) return;
      updateReportData({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) });
      setLocating(false); setGps('Location captured. Check the coordinates before continuing.');
    }, fail, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }
  function submit(event) {
    event.preventDefault();
    const next = validateReport(reportData); setErrors(next);
    if (Object.keys(next).length) { if (next.latitude || next.longitude) setManual(true); return; }
    navigate('/public/report-hazard/photo');
  }
  return <div className="mobile-page"><MobileHeader title="Hazard Details" subtitle="Provide more information about the hazard." back="/public/report-hazard" step={2}/><form noValidate onSubmit={submit}><div className="mobile-field"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={500} rows={4} placeholder="Describe what you see…" value={reportData.description} onChange={e => updateReportData({ description: e.target.value })} aria-invalid={!!errors.description} aria-describedby="description-help"/><div className="character-count">{reportData.description.length}/500</div><p id="description-help" className="mobile-error">{errors.description}</p></div><section className="mobile-section"><h2>Location</h2><button type="button" className="location-button" onClick={locate} disabled={locating}><MapPin size={19}/>{locating ? 'Finding your location…' : 'Use my current location'}<LocateFixed size={19}/></button><LocationCard latitude={reportData.latitude} longitude={reportData.longitude}/>{gps && <p role="status" className="mobile-feedback">{gps}</p>}<div className="location-links">{gps.startsWith('Unable') && <button type="button" onClick={locate} disabled={locating}>Try Again</button>}<button type="button" aria-expanded={manual} onClick={() => { request.current++; setLocating(false); setManual(!manual); }}>Enter Location Manually</button></div>{manual && <div className="coordinate-fields">{['latitude', 'longitude'].map(field => <div className="mobile-field" key={field}><label htmlFor={field}>{field === 'latitude' ? 'Latitude' : 'Longitude'}</label><input id={field} type="number" step="any" min={field === 'latitude' ? -90 : -180} max={field === 'latitude' ? 90 : 180} value={reportData[field]} onChange={e => updateReportData({ [field]: e.target.value })} aria-invalid={!!errors[field]} aria-describedby={`${field}-error`}/><p className="mobile-error" id={`${field}-error`}>{errors[field]}</p></div>)}</div>}</section><div className="mobile-field"><label htmlFor="dateTime">Date and Time</label><input id="dateTime" name="dateTime" type="datetime-local" max={localDateTime()} value={reportData.dateTime} onChange={e => updateReportData({ dateTime: e.target.value })} aria-invalid={!!errors.dateTime} aria-describedby="dateTime-error"/><p className="mobile-error" id="dateTime-error">{errors.dateTime}</p></div><MobilePrimaryButton>Next</MobilePrimaryButton></form></div>;
}
