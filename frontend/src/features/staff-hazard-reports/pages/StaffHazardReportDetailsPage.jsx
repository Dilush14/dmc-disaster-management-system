import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, MapPin, XCircle } from 'lucide-react';
import { getStaffHazardReport, getStaffHazardReportPhoto, rejectStaffHazardReport, verifyStaffHazardReport } from '../services/staffHazardReportService';

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Detail({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value || 'Not provided'}</dd></div>;
}

export default function StaffHazardReportDetailsPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    let active = true;
    getStaffHazardReport(reportId)
      .then(data => {
        if (active) setReport(data);
        if (data.photoUrl) {
          return getStaffHazardReportPhoto(reportId).then(blob => {
            if (active) setPhotoUrl(URL.createObjectURL(blob));
          });
        }
        return null;
      })
      .catch(nextError => active && setError(nextError.message))
      .finally(() => { if (!active) return; });
    return () => {
      active = false;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [reportId]);

  async function runAction(request) {
    setBusy(true);
    setError('');
    try {
      setReport(await request());
      return true;
    } catch (nextError) {
      setError(nextError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function reject() {
    if (!reason.trim()) {
      setError('Enter a reason before rejecting this report.');
      return;
    }
    return runAction(() => rejectStaffHazardReport(report.reportId, reason)).then(success => {
      if (success) setRejecting(false);
    });
  }

  if (!report) {
    return <div className="space-y-4"><Link to="/staff/hazard-reports" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16}/> Back to reports</Link>{error ? <p role="alert" className="text-red-700">{error}</p> : <p role="status">Loading report…</p>}</div>;
  }

  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = hasLocation ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}` : '';
  const embeddedMapUrl = hasLocation ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}` : '';
  const isPending = report.status === 'PENDING_VERIFICATION';

  return <div className="space-y-6">
    <Link to="/staff/hazard-reports" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16}/> Back to reports</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">DMC officer review</div><h1 className="mt-2 text-3xl font-black">Hazard report {report.reportId}</h1><p className="mt-2 text-sm text-slate-500">Submitted {formatDate(report.submittedAt || report.dateTime)}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black">{report.status || 'UNKNOWN'}</span>{isPending && <><button type="button" disabled={busy} onClick={() => runAction(() => verifyStaffHazardReport(report.reportId))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={15}/> Verify report</button><button type="button" disabled={busy} onClick={() => { setRejecting(true); setError(''); }} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><XCircle size={15}/> Reject report</button></>}</div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><FileText size={19} className="text-blue-700"/><h2 className="text-xl font-bold">Report information</h2></div><dl className="mt-5 grid gap-5 sm:grid-cols-2"><Detail label="Report ID" value={report.reportId}/><Detail label="Hazard type" value={report.hazardType}/><Detail label="Submitted" value={formatDate(report.submittedAt)}/><Detail label="Incident date and time" value={formatDate(report.dateTime)}/><Detail label="Current status" value={report.status}/><Detail label="Reporter role" value={report.reporterRole}/><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt><dd className="mt-2 rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">{report.description || 'No description provided.'}</dd></div></dl></section>
        {isPending && rejecting && <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><XCircle size={19} className="text-red-600"/><h2 className="text-lg font-bold">Why are you rejecting this report?</h2></div><p className="mt-1 text-sm text-slate-500">A clear reason is required and will be saved for the reporter.</p><textarea autoFocus value={reason} onChange={event => setReason(event.target.value)} rows="4" placeholder="Explain why this report cannot be verified." className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-red-500"/><div className="mt-3 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => { setRejecting(false); setReason(''); setError(''); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={busy || !reason.trim()} onClick={reject} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Confirm rejection</button></div></section>}
        {report.rejectionReason && <section className="rounded-2xl border border-red-200 bg-red-50 p-5"><h2 className="font-bold text-red-900">Rejection feedback</h2><p className="mt-2 text-sm text-red-800">{report.rejectionReason}</p></section>}
      </div>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><MapPin size={19} className="text-blue-700"/><h2 className="text-xl font-bold">Reported location</h2></div>{hasLocation ? <><iframe title="Reported hazard location" src={embeddedMapUrl} className="mt-4 h-72 w-full rounded-xl border-0" loading="lazy"/><div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span><b>{latitude.toFixed(6)}, {longitude.toFixed(6)}</b><span className="block text-xs text-slate-500">GPS coordinates from citizen report</span></span><a href={mapUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700">Open map</a></div></> : <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No valid location was submitted with this report.</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Evidence and review</h2>{photoUrl ? <img src={photoUrl} alt="Hazard evidence submitted by citizen" className="mt-4 max-h-80 w-full rounded-xl object-contain bg-slate-100"/> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{report.photoUrl ? 'Loading submitted photo…' : 'No photo was attached.'}</p>}<dl className="mt-5 space-y-4 text-sm"><Detail label="Reviewed at" value={formatDate(report.reviewedAt)}/><Detail label="Reviewed by" value={report.reviewedBy}/><Detail label="Reporter ID" value={report.reporterId}/></dl></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Review guidance</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>Confirm the hazard type and description are credible.</li><li>Check the map location before verifying.</li><li>Use a clear, specific reason when rejecting.</li><li>Verified reports will be handled in the next response workflow.</li></ul></section>
      </div>
    </div>
  </div>;
}
