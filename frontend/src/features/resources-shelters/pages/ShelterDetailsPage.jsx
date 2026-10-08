import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import MonitoringTabs from '../../monitoring-reports/components/MonitoringTabs';
import { getShelter, updateOccupancy } from '../services/resourcesSheltersService';
import { availableSpace, checkShelterCapacity, occupancyRate, validateOccupancy } from '../utils/resourcesShelters';
import { ShelterFormDialog } from '../components/FormDialogs';
import { CapacityWarningDialog } from '../components/WarningDialogs';
import { Card, ErrorBanner, Field, formatDate, formatDateTime, inputClass, Loading, OccupancyBar, PrimaryButton, SecondaryButton, StatusBadge, useAsync } from '../components/ui';

const tabs = ['Overview', 'Occupancy', 'Facilities', 'Contacts', 'History'];

export default function ShelterDetailsPage() {
  const { shelterId } = useParams();
  const navigate = useNavigate();
  const { data: shelter, error, loading, reload, setData } = useAsync(signal => getShelter(shelterId, { signal }), [shelterId]);
  const [tab, setTab] = useState('Overview');
  const [editing, setEditing] = useState(false);

  if (error && !shelter) return <ErrorBanner message={`Shelter information is unavailable. ${error}`} onRetry={reload} />;
  if (loading && !shelter) return <Loading label="Loading shelter…" />;

  return (
    <div className="space-y-6">
      <Link to="/staff/resources-shelters/shelters" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft size={16} />Back to shelters</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900">{shelter.name}</h1>
          <StatusBadge status={shelter.status} />
        </div>
        <SecondaryButton onClick={() => setEditing(true)}><Pencil size={14} />Edit</SecondaryButton>
      </div>
      <MonitoringTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {(tab === 'Overview' || tab === 'Occupancy') && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <OccupancyCard shelter={shelter} />
            <UpdateOccupancyCard shelter={shelter} onSaved={updated => setData(current => ({ ...current, ...updated, history: [{ id: `local-${Date.now()}`, previousOccupied: shelter.occupied, occupied: updated.occupied, capacity: updated.capacity, recordedAt: updated.updatedAt }, ...(current.history || [])] }))} onFindAlternative={() => navigate('/staff/resources-shelters/shelters')} />
          </div>
          {tab === 'Overview' ? <BasicInfo shelter={shelter} /> : <HistoryCard shelter={shelter} />}
        </div>
      )}
      {tab === 'Facilities' && <FacilitiesCard shelter={shelter} />}
      {tab === 'Contacts' && <BasicInfo shelter={shelter} contactsOnly />}
      {tab === 'History' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <HistoryCard shelter={shelter} />
          <Card title="Resource Deliveries">
            <ul className="divide-y divide-slate-100 text-sm">
              {(shelter.distributions || []).map(row => (
                <li key={row.id} className="flex items-center justify-between py-2">
                  <span>{row.items.map(item => `${item.quantity.toLocaleString()} ${item.name}`).join(', ')}<span className="block text-xs text-slate-500">{formatDate(row.distributionDate)}</span></span>
                  <StatusBadge status={row.status} />
                </li>
              ))}
              {!shelter.distributions?.length && <li className="py-2 text-slate-500">No resources delivered yet.</li>}
            </ul>
          </Card>
        </div>
      )}

      {editing && <ShelterFormDialog shelter={shelter} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
    </div>
  );
}

function OccupancyCard({ shelter }) {
  return (
    <Card title="Occupancy Status">
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black text-slate-900">{shelter.occupied.toLocaleString()} / {shelter.capacity.toLocaleString()}</div>
        <div className="text-lg font-bold text-slate-700">{shelter.occupancyRate}%</div>
      </div>
      <div className="mt-3"><OccupancyBar rate={shelter.occupancyRate} /></div>
      <div className="mt-2 text-sm text-slate-500">{shelter.available.toLocaleString()} places available</div>
    </Card>
  );
}

/** Updates occupancy; on failure the last saved values are kept and the officer can retry. */
function UpdateOccupancyCard({ shelter, onSaved, onFindAlternative }) {
  const [value, setValue] = useState(String(shelter.occupied));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [warning, setWarning] = useState(null);

  const save = async () => {
    const problem = validateOccupancy(value, shelter);
    if (problem) return setError(problem);
    const next = Number(value);
    const arriving = next - shelter.occupied;
    const capacityProblem = arriving > 0 ? checkShelterCapacity(shelter, arriving) : null;
    if (capacityProblem) return setWarning(capacityProblem);
    setSaving(true);
    setError('');
    try {
      const updated = await updateOccupancy(shelter.id, next, shelter.occupied);
      setResult({ from: shelter.occupied, to: updated.occupied, availableFrom: shelter.available, availableTo: updated.available });
      onSaved(updated);
    } catch (failure) {
      // Roll back the input to the last valid value.
      setValue(String(shelter.occupied));
      setError(`${failure.message} The last saved occupancy (${shelter.occupied}) has been kept.`);
    } finally {
      setSaving(false);
    }
  };

  const preview = Number.isInteger(Number(value)) && value !== '' ? availableSpace({ capacity: shelter.capacity, occupied: Number(value) }) : null;

  return (
    <Card title="Update Occupancy">
      <Field label="Current Occupied" required error={error}>
        <input type="number" min="0" className={inputClass} value={value} disabled={!shelter.active} onChange={event => { setValue(event.target.value); setResult(null); }} />
      </Field>
      {preview !== null && Number(value) !== shelter.occupied && Number(value) <= shelter.capacity && (
        <p className="mt-2 text-xs text-slate-500">Available space will be {preview.toLocaleString()} ({occupancyRate(Number(value), shelter.capacity)}% occupied).</p>
      )}
      {result && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5" />
          <span>Occupancy updated: {result.from} → {result.to}. Available space recalculated: {result.availableFrom} → {result.availableTo}.</span>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <PrimaryButton disabled={saving || !shelter.active} onClick={save}>{saving ? 'Updating…' : 'Update'}</PrimaryButton>
      </div>
      {warning && <CapacityWarningDialog warning={warning} onClose={() => setWarning(null)} onViewAlternatives={onFindAlternative} />}
    </Card>
  );
}

function BasicInfo({ shelter, contactsOnly }) {
  const rows = contactsOnly
    ? [['Managing Organization', shelter.managingOrganization], ['Contact Person', shelter.contactPerson], ['Contact Number', shelter.contactNumber]]
    : [['District', shelter.district], ['Address', shelter.address], ['Shelter Type', shelter.shelterType], ['Managing Organization', shelter.managingOrganization], ['Contact Person', shelter.contactPerson], ['Contact Number', shelter.contactNumber], ['Last Updated', formatDateTime(shelter.updatedAt)]];
  return (
    <Card title={contactsOnly ? 'Contacts' : 'Basic Information'}>
      <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-y-2 text-sm">
        {rows.map(([label, value]) => <div key={label} className="contents"><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-800">{value || '—'}</dd></div>)}
      </dl>
      {!contactsOnly && <div className="mt-5"><FacilitiesList facilities={shelter.facilities} /></div>}
    </Card>
  );
}

function FacilitiesList({ facilities = [] }) {
  return (
    <>
      <div className="mb-2 text-sm font-bold text-slate-800">Facilities Available</div>
      <ul className="grid grid-cols-2 gap-2 text-sm text-slate-700">
        {facilities.map(item => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" />{item}</li>)}
        {!facilities.length && <li className="text-slate-500">No facilities recorded.</li>}
      </ul>
    </>
  );
}

function FacilitiesCard({ shelter }) {
  return <Card><FacilitiesList facilities={shelter.facilities} /></Card>;
}

function HistoryCard({ shelter }) {
  return (
    <Card title="Occupancy History">
      <ul className="divide-y divide-slate-100 text-sm">
        {(shelter.history || []).map(entry => (
          <li key={entry.id} className="flex justify-between py-2">
            <span>{entry.previousOccupied} → <span className="font-semibold">{entry.occupied}</span> <span className="text-slate-500">of {entry.capacity}</span></span>
            <span className="text-slate-500">{formatDateTime(entry.recordedAt)}</span>
          </li>
        ))}
        {!shelter.history?.length && <li className="py-2 text-slate-500">No occupancy updates recorded yet.</li>}
      </ul>
    </Card>
  );
}
