import { useState } from 'react';
import { Siren } from 'lucide-react';
import { closeResponse, getActiveResponses, startResponse } from '../services/resourcesSheltersService';
import { describeResponse, DISTRICTS, HAZARD_LABELS } from '../utils/resourcesShelters';
import { ErrorBanner, Field, formatDateTime, inputClass, Modal, PrimaryButton, SecondaryButton, useAsync } from './ui';

/** The emergency response(s) the officer is coordinating shelters and resources for. */
export default function ActiveResponseBanner({ district }) {
  const { data, error, loading, reload } = useAsync(signal => getActiveResponses(district, { signal }), [district]);
  const [declaring, setDeclaring] = useState(false);
  const [closeError, setCloseError] = useState('');

  const close = async response => {
    if (!window.confirm(`Close "${response.title}"? It will no longer be shown as active.`)) return;
    setCloseError('');
    try {
      await closeResponse(response.id);
      reload();
    } catch (failure) {
      setCloseError(failure.message);
    }
  };

  if (error) return <ErrorBanner message={`Active emergency response is unavailable. ${error}`} onRetry={reload} />;
  if (loading && !data) return null;
  const dialog = declaring && (
    <DeclareResponseDialog district={district} onClose={() => setDeclaring(false)} onSaved={() => { setDeclaring(false); reload(); }} />
  );
  const declareButton = <SecondaryButton onClick={() => setDeclaring(true)}>Declare Emergency Response</SecondaryButton>;
  if (!data?.length) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>No active emergency response. Shelters and resources are shown for routine coordination.</span>
        {declareButton}
        {dialog}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {closeError && <ErrorBanner message={closeError} />}
      {data.map(response => {
        const view = describeResponse(response);
        return (
          <section key={response.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3">
              <Siren size={20} className="mt-0.5 text-rose-600" />
              <div>
                <h2 className="text-base font-bold text-rose-900">{response.title}</h2>
                <p className="text-sm text-rose-800">{view.hazard} · {response.district} District</p>
                <p className="text-sm text-rose-800">Affected areas: {view.areas}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs font-semibold text-rose-700">Active since {formatDateTime(response.startedAt)}</span>
              <button type="button" className="text-xs font-semibold text-rose-700 underline" onClick={() => close(response)}>Close response</button>
            </div>
          </section>
        );
      })}
      <div className="flex justify-end">{declareButton}</div>
      {dialog}
    </div>
  );
}

function DeclareResponseDialog({ district, onClose, onSaved }) {
  const [form, setForm] = useState({ hazardType: 'FLOOD', district: district && district !== 'All' ? district : '', title: '', areas: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    const found = {};
    if (!form.district) found.district = 'Select a district.';
    if (!form.title.trim()) found.title = 'Enter a title.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError('');
    try {
      const affectedAreas = form.areas.split(',').map(item => item.trim()).filter(Boolean);
      onSaved(await startResponse({ hazardType: form.hazardType, district: form.district, title: form.title.trim(), affectedAreas }));
    } catch (failure) {
      setError(failure.message);
      setErrors(failure.fields || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Declare Emergency Response"
      tone="red"
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Declare Response'}</PrimaryButton></>}
    >
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hazard" required error={errors.hazardType}>
          <select className={inputClass} value={form.hazardType} onChange={set('hazardType')}>
            {Object.entries(HAZARD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="District" required error={errors.district}>
          <select className={inputClass} value={form.district} onChange={set('district')}><option value="">Select district</option>{DISTRICTS.map(item => <option key={item}>{item}</option>)}</select>
        </Field>
        <div className="sm:col-span-2"><Field label="Title" required error={errors.title}><input className={inputClass} placeholder="e.g. Colombo Flood Response" value={form.title} onChange={set('title')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Affected Areas (comma separated)" error={errors.affectedAreas}><input className={inputClass} placeholder="e.g. Kelani River Basin, Kolonnawa" value={form.areas} onChange={set('areas')} /></Field></div>
      </div>
    </Modal>
  );
}
