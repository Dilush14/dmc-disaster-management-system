import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, FileCheck2, Send, Sparkles } from 'lucide-react';
import { affectedDistricts, warningTypes } from '../data/warnings';
import { createHazardWarning } from '../services/hazardWarningService';
import { getStaffHazardReports } from '../../staff-hazard-reports/services/staffHazardReportService';

const steps = ['Hazard Type', 'Affected Area', 'Warning Details', 'Channels', 'Review'];

export default function CreateHazardWarningPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState('Flood');
  const [areas, setAreas] = useState(['Colombo']);
  const [severity, setSeverity] = useState('High');
  const [message, setMessage] = useState('Heavy rainfall is expected in the selected areas. Please stay alert and follow official updates.');
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [channels, setChannels] = useState(['MOBILE_APP', 'SMS', 'EMAIL', 'WEBSITE']);
  const [mode, setMode] = useState('');
  const [verifiedReports, setVerifiedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (mode !== 'verified' || reportsLoaded) return;
    setReportsLoading(true);
    getStaffHazardReports()
      .then(reports => setVerifiedReports(reports.filter(report => report.status === 'VERIFIED')))
      .catch(nextError => setError(nextError.message))
      .finally(() => {
        setReportsLoading(false);
        setReportsLoaded(true);
      });
  }, [mode, reportsLoaded]);
  const toggleArea = area => setAreas(current => current.includes(area) ? current.filter(item => item !== area) : [...current, area]);
  function chooseVerifiedReport(report) {
    setSelectedReport(report);
    const normalizedType = warningTypes.find(item => item.name.toLowerCase() === String(report.hazardType || '').replaceAll('_', ' ').toLowerCase())?.name || 'Other';
    setType(normalizedType);
    setSeverity('High');
    setMessage(`Verified hazard report ${report.reportId}: ${report.description || 'A reported hazard requires an official warning.'}`);
    const matchingDistrict = affectedDistricts.find(district => String(report.location || '').toLowerCase().includes(district.toLowerCase()));
    if (matchingDistrict) setAreas([matchingDistrict]);
    setStep(steps.length - 1);
  }
  function chooseMode(nextMode) {
    setMode(nextMode);
    setSelectedReport(null);
    setError('');
    if (nextMode === 'manual') setStep(0);
  }
  function returnToModeSelection() {
    setMode('');
    setSelectedReport(null);
    setStep(0);
    setError('');
  }
  async function next() {
    if (step !== steps.length - 1) {
      setStep(value => value + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const warning = await createHazardWarning({
        type,
        affectedAreas: areas,
        severity,
        title: selectedReport ? `${type} warning from ${selectedReport.reportId}` : `${type} warning`,
        message,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
        channels,
      });
      navigate('/staff/warnings/success', { state: { warning } });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><button type="button" onClick={returnToModeSelection} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ChevronLeft size={16}/> Back to warning type</button><h1 className="mt-3 text-3xl font-black">Create Hazard Warning</h1><p className="mt-1 text-sm text-slate-500">Choose how to create the warning, then complete the broadcast details.</p></div>
    {!mode && <div className="grid gap-5 md:grid-cols-2">
      <button type="button" onClick={() => chooseMode('manual')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md">
        <Sparkles className="text-blue-700" size={28}/><h2 className="mt-4 text-xl font-black">Create a normal warning</h2><p className="mt-2 text-sm leading-6 text-slate-500">Start a new warning manually by selecting the hazard type, affected districts, severity, message, and notification channels.</p><span className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">Start manual warning</span>
      </button>
      <button type="button" onClick={() => chooseMode('verified')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md">
        <FileCheck2 className="text-emerald-700" size={28}/><h2 className="mt-4 text-xl font-black">Create from a verified hazard</h2><p className="mt-2 text-sm leading-6 text-slate-500">Select a hazard report already verified by staff and use its details as the basis for an official warning.</p><span className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">View verified hazards</span>
      </button>
    </div>}
    {mode === 'verified' && !selectedReport && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Select a verified hazard</h2><p className="mt-1 text-sm text-slate-500">Only reports marked Verified are available for warning creation.</p></div><button type="button" onClick={() => setMode('')} className="text-sm font-bold text-blue-700">Change type</button></div>{reportsLoading && <p role="status" className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">Loading verified hazards…</p>}{!reportsLoading && !verifiedReports.length && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No verified hazard reports are available yet.</p>}<div className="mt-5 grid gap-3">{verifiedReports.map(report => <button key={report.reportId} type="button" onClick={() => chooseVerifiedReport(report)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{report.reportId}</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Verified</span></div><p className="mt-2 text-sm font-semibold">{String(report.hazardType || 'Other').replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-slate-600">{report.location || `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{report.description || 'No description provided.'}</p><p className="mt-2 text-xs text-slate-400">{new Date(report.submittedAt || report.dateTime).toLocaleString()}</p></button>)}</div></section>}
    {mode && (mode === 'manual' || selectedReport) && <><div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">{steps.map((label, index) => <div key={label} className="flex items-center gap-2"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index <= step ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < step ? <Check size={15}/> : index + 1}</div><span className={`hidden text-xs font-bold sm:block ${index === step ? 'text-blue-700' : 'text-slate-500'}`}>{label}</span>{index < steps.length - 1 && <div className="mx-1 hidden h-px w-8 bg-slate-200 sm:block lg:w-16"/>}</div>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {step === 0 && <><h2 className="text-xl font-bold">Select Hazard Type</h2><p className="mt-1 text-sm text-slate-500">Choose the hazard category for this warning.</p><div className="mt-6 grid gap-3 sm:grid-cols-5">{warningTypes.map(item => <button key={item.name} type="button" onClick={() => setType(item.name)} className={`rounded-xl border p-5 text-center ${type === item.name ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}><div className="text-3xl">{item.icon}</div><div className="mt-2 text-sm font-bold">{item.name}</div></button>)}</div></>}
      {step === 1 && <><h2 className="text-xl font-bold">Select Affected Area</h2><p className="mt-1 text-sm text-slate-500">Select districts that should receive this warning.</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{affectedDistricts.map(area => <label key={area} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold hover:bg-slate-50"><input type="checkbox" checked={areas.includes(area)} onChange={() => toggleArea(area)} className="h-4 w-4 accent-blue-700"/>{area} District</label>)}</div></>}
      {step === 2 && <><h2 className="text-xl font-bold">Warning Details & Severity</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><label className="md:col-span-2 text-sm font-bold">Warning message<textarea value={message} onChange={event => setMessage(event.target.value)} rows="5" className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500"/></label><label className="text-sm font-bold">Valid from<input type="datetime-local" value={validFrom} onChange={event => setValidFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label><label className="text-sm font-bold">Valid until<input type="datetime-local" value={validUntil} onChange={event => setValidUntil(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label></div><div className="mt-5 flex flex-wrap gap-2">{['Low','Medium','High','Severe'].map(value => <button key={value} type="button" onClick={() => setSeverity(value)} className={`rounded-lg px-4 py-2 text-sm font-bold ${severity === value ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{value}</button>)}</div></>}
      {step === 3 && <><h2 className="text-xl font-bold">Select Notification Channels</h2><p className="mt-1 text-sm text-slate-500">Choose how this warning will reach people who registered with the system.</p><div className="mt-6 space-y-3">{[['MOBILE_APP', 'Mobile notification', 'Shown in the DMC mobile experience'], ['SMS', 'SMS alert', 'Sent to registered phone numbers when SMS delivery is configured'], ['EMAIL', 'Email notification', 'Sent to registered email addresses when email delivery is configured'], ['WEBSITE', 'DMC website', 'Shown on the signed-in DMC homepage']].map(([value, label, description]) => <label key={value} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><span className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={channels.includes(value)} onChange={() => setChannels(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])} className="h-4 w-4 accent-blue-700"/><span><span className="block">{label}</span><span className="mt-1 block text-xs font-normal text-slate-500">{description}</span></span></span></label>)}</div></>}
      {step === 4 && <><h2 className="text-xl font-bold">Review & Confirm Broadcast</h2><div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-2"><div><span className="text-slate-500">Hazard type</span><p className="font-bold">{type}</p></div><div><span className="text-slate-500">Severity</span><p className="font-bold">{severity}</p></div><div><span className="text-slate-500">Affected area</span><p className="font-bold">{areas.join(', ')} District</p></div><div><span className="text-slate-500">Reference no.</span><p className="font-bold">AUTO-GEN</p></div><div className="sm:col-span-2"><span className="text-slate-500">Message</span><p className="mt-1">{message}</p></div></div></>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-8 flex justify-between border-t border-slate-100 pt-5"><button type="button" disabled={step === 0 || busy} onClick={() => setStep(value => value - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"><ChevronLeft size={16}/> Back</button><button type="button" disabled={busy} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{step === steps.length - 1 ? <><Send size={15}/> {busy ? 'Publishing…' : 'Publish Warning'}</> : <>Next <ChevronRight size={16}/></>}</button></div>
    </div></>}
  </div>;
}
