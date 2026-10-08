import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, MapPin, Save, Send, XCircle } from 'lucide-react';
import { cancelHazardWarning, escalateHazardWarning, getHazardWarning, updateHazardWarning } from '../services/hazardWarningService';

export default function WarningDetailsPage() {
  const { warningId } = useParams();
  const [warning, setWarning] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getHazardWarning(warningId).then(result => {
      if (active) {
        setWarning(result);
        setForm({ title: result.title || '', message: result.message || '', severity: result.severity || 'Medium', affectedAreas: result.affectedAreas || [], validUntil: result.validUntil || '' });
      }
    }).catch(nextError => {
      if (active) setError(nextError.message);
    });
    return () => { active = false; };
  }, [warningId]);

  async function updateStatus(action) {
    setBusy(true);
    setError('');
    try {
      const result = action === 'escalate' ? await escalateHazardWarning(warning.id) : await cancelHazardWarning(warning.id);
      setWarning(result);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveChanges(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await updateHazardWarning(warning.id, form);
      setWarning(result);
      setEditing(false);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!warning || !form) {
    return <div className="space-y-4"><Link to="/staff/warnings" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16}/> Back to warnings</Link>{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : <p role="status">Loading warning…</p>}</div>;
  }

  const area = warning.area || warning.affectedAreas?.map(item => `${item} District`).join(', ');
  const auditTrail = warning.auditTrail || [];
  return <div className="space-y-6">
    <Link to="/staff/warnings" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16}/> Back to warnings</Link>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Warning details</div><h1 className="mt-2 text-3xl font-black">{warning.id}</h1><p className="mt-1 text-sm text-slate-500">Issued {warning.issuedOn}</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"><Edit3 size={15}/> {editing ? 'Close edit' : 'Edit'}</button><button type="button" disabled={busy} onClick={() => updateStatus('escalate')} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Send size={15}/> Escalate</button><button type="button" disabled={busy} onClick={() => updateStatus('cancel')} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-60">Cancel</button></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {editing && <form onSubmit={saveChanges} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm"><h2 className="text-xl font-bold">Edit warning</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold md:col-span-2">Title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"/></label><label className="text-sm font-bold">Severity<select value={form.severity} onChange={event => setForm({ ...form, severity: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">{['Low','Medium','High','Severe'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-bold">Valid until<input type="datetime-local" value={form.validUntil.slice(0, 16)} onChange={event => setForm({ ...form, validUntil: new Date(event.target.value).toISOString() })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"/></label><label className="text-sm font-bold md:col-span-2">Message<textarea required rows="4" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"/></label></div><button disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save size={15}/> {busy ? 'Saving…' : 'Save changes'}</button></form>}
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{warning.title}</h2><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">{warning.severity}</span></div><dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Hazard type</dt><dd className="mt-1 font-bold">{warning.type}</dd></div><div><dt className="text-slate-500">Affected area</dt><dd className="mt-1 font-bold">{area}</dd></div><div><dt className="text-slate-500">Valid from</dt><dd className="mt-1 font-bold">{warning.issuedOn}</dd></div><div><dt className="text-slate-500">Valid until</dt><dd className="mt-1 font-bold">{warning.validUntil}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Message</dt><dd className="mt-1 rounded-xl bg-slate-50 p-4 leading-6">{warning.message}</dd></div></dl></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Affected Area Map</h2><div className="relative mt-4 h-56 rounded-xl bg-[#dcebdc]"><div className="absolute inset-8 rounded-[45%] bg-[#b9d99c]"/><div className="absolute left-1/2 top-1/3 h-16 w-16 rounded-full bg-red-400/80"/><div className="relative z-10 flex h-full items-center justify-center"><MapPin className="text-red-700" size={32}/></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><CheckCircle2 className="text-emerald-600" size={18}/><b className="mt-1 block">{warning.status}</b><span className="text-xs text-slate-500">{warning.recipients || 0} recipients</span></div><div className="rounded-xl bg-slate-50 p-3"><XCircle className="text-slate-500" size={18}/><b className="mt-1 block">Audit trail</b><span className="text-xs text-slate-500">{auditTrail.length} events recorded</span></div></div></section>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Timeline & Audit Trail</h2><div className="mt-5 space-y-4">{auditTrail.length ? auditTrail.slice().reverse().map((event, index) => <div key={`${event.at}-${index}`} className="flex gap-3 text-sm"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"/><div><p className="font-bold text-slate-800">{event.action}</p><p className="text-slate-500">{event.actor} · {new Date(event.at).toLocaleString()}</p></div></div>) : <p className="text-sm text-slate-500">No audit events recorded yet.</p>}</div></section>
  </div>;
}
