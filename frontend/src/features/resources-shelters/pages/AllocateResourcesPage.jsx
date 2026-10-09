import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { allocateResources, listResources, listShelters } from '../services/resourcesSheltersService';
import {
  checkShelterCapacity, checkStock, filterShelters, TRANSPORT_METHODS, validateAllocationDetails, validateResourceSelection,
} from '../utils/resourcesShelters';
import { CapacityWarningDialog, StockWarningDialog } from '../components/WarningDialogs';
import ActiveResponseBanner from '../components/ActiveResponseBanner';
import { Card, ErrorBanner, Field, formatDate, inputClass, Loading, PageHeader, PrimaryButton, SecondaryButton, Select, StatusBadge, Stepper, useAsync } from '../components/ui';

const steps = ['Select Resources', 'Select Destination', 'Allocation Details', 'Review'];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function AllocateResourcesPage() {
  const resources = useAsync(signal => listResources({ signal }), []);
  const shelters = useAsync(signal => listShelters(undefined, { signal }), []);
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState({});
  const [shelterId, setShelterId] = useState('');
  const [details, setDetails] = useState({ distributionDate: today(), transportMethod: '', notes: '', expectedPeople: '' });
  const [errors, setErrors] = useState({});
  const [stockWarning, setStockWarning] = useState(null);
  const [capacityWarning, setCapacityWarning] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recorded, setRecorded] = useState(null);

  const shelter = (shelters.data || []).find(item => item.id === shelterId);
  const selectedItems = (resources.data || []).filter(item => item.id in selection).map(item => ({ ...item, quantity: Number(selection[item.id]) }));

  const loadError = resources.error || shelters.error;
  if (loadError && (!resources.data || !shelters.data)) {
    return <div className="space-y-6"><PageHeader title="Allocate Resources" /><ErrorBanner message={`Shelter or resource information is unavailable. ${loadError}`} onRetry={() => { resources.reload(); shelters.reload(); }} /></div>;
  }
  if (!resources.data || !shelters.data) return <div className="space-y-6"><PageHeader title="Allocate Resources" /><Loading /></div>;

  const reset = () => {
    setStep(1); setSelection({}); setShelterId(''); setRecorded(null); setSubmitError('');
    setDetails({ distributionDate: today(), transportMethod: '', notes: '', expectedPeople: '' });
    resources.reload(); shelters.reload();
  };

  const goToDestination = () => {
    const problem = validateResourceSelection(selection);
    setErrors({ selection: problem });
    if (problem) return;
    const warning = checkStock(selection, resources.data);
    if (warning) return setStockWarning(warning);
    setStep(2);
  };

  const goToReview = () => {
    const found = validateAllocationDetails(details, today());
    setErrors(found);
    if (Object.keys(found).length) return;
    const warning = checkShelterCapacity(shelter, details.expectedPeople);
    if (warning) return setCapacityWarning(warning);
    setStep(4);
  };

  const confirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await allocateResources({
        items: selectedItems.map(item => ({ resourceId: item.id, quantity: item.quantity })),
        shelterId,
        distributionDate: details.distributionDate,
        transportMethod: details.transportMethod,
        notes: details.notes,
        expectedPeople: details.expectedPeople === '' ? 0 : Number(details.expectedPeople),
      });
      setRecorded(result);
    } catch (failure) {
      // Stock or capacity may have changed since the data was loaded; refresh so the officer can adjust.
      setSubmitError(failure.message);
      resources.reload();
      shelters.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (recorded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Allocate Resources" />
        <Card className="mx-auto max-w-xl text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h2 className="mt-3 text-xl font-black text-slate-900">Allocation recorded</h2>
          <p className="mt-1 text-sm text-slate-600">{recorded.id} · {recorded.items.length} resource(s) to {recorded.shelterName} on {formatDate(recorded.distributionDate)}.</p>
          <div className="mt-2"><StatusBadge status={recorded.status} /></div>
          <div className="mt-5 flex justify-center gap-2">
            <SecondaryButton onClick={reset}>New Allocation</SecondaryButton>
            <Link to="../distributions" relative="path" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">View Distribution History</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Allocate Resources" subtitle="Send relief supplies from stock to a shelter." />
      <ActiveResponseBanner />
      <Card>
        <Stepper steps={steps} step={step} />
        {step === 1 && <ResourceStep resources={resources.data} selection={selection} setSelection={setSelection} error={errors.selection} />}
        {step === 2 && <DestinationStep shelters={shelters.data} shelterId={shelterId} setShelterId={setShelterId} />}
        {step === 3 && <DetailsStep details={details} setDetails={setDetails} errors={errors} shelter={shelter} items={selectedItems} />}
        {step === 4 && <ReviewStep details={details} shelter={shelter} items={selectedItems} />}
        {submitError && <div className="mt-4"><ErrorBanner message={submitError} /></div>}

        <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
          {step === 1 ? <Link to=".." relative="path" className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</Link>
            : <SecondaryButton onClick={() => { setStep(step - 1); setErrors({}); }}><ArrowLeft size={16} />Back</SecondaryButton>}
          {step === 1 && <PrimaryButton onClick={goToDestination}>Next<ArrowRight size={16} /></PrimaryButton>}
          {step === 2 && <PrimaryButton disabled={!shelter} onClick={() => setStep(3)}>Next<ArrowRight size={16} /></PrimaryButton>}
          {step === 3 && <PrimaryButton onClick={goToReview}>Review Allocation</PrimaryButton>}
          {step === 4 && <PrimaryButton disabled={submitting} onClick={confirm}>{submitting ? 'Allocating…' : 'Confirm Allocation'}</PrimaryButton>}
        </div>
      </Card>

      {stockWarning && (
        <StockWarningDialog
          warning={stockWarning}
          onClose={() => setStockWarning(null)}
          onAdjust={() => { setSelection(current => ({ ...current, [stockWarning.resourceId]: stockWarning.available })); setStockWarning(null); }}
        />
      )}
      {capacityWarning && (
        <CapacityWarningDialog
          warning={capacityWarning}
          onClose={() => setCapacityWarning(null)}
          onViewAlternatives={() => { setCapacityWarning(null); setShelterId(''); setStep(2); }}
        />
      )}
    </div>
  );
}

function ResourceStep({ resources, selection, setSelection, error }) {
  const toggle = resource => setSelection(current => {
    const next = { ...current };
    if (resource.id in next) delete next[resource.id];
    else next[resource.id] = '';
    return next;
  });
  return (
    <>
      <h2 className="mb-3 text-base font-bold text-slate-800">Select Resources to Allocate</h2>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 py-2" /><th>Item Name</th><th className="text-right">Available Quantity</th><th className="pl-4">Unit</th><th>Allocate Quantity</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map(resource => {
              const checked = resource.id in selection;
              return (
                <tr key={resource.id} className={resource.available === 0 ? 'opacity-50' : ''}>
                  <td className="py-2"><input type="checkbox" aria-label={`Select ${resource.name}`} disabled={resource.available === 0} checked={checked} onChange={() => toggle(resource)} /></td>
                  <td className="font-medium text-slate-800">{resource.name}</td>
                  <td className="text-right">{resource.available.toLocaleString()}</td>
                  <td className="pl-4">{resource.unit}</td>
                  <td>
                    <input type="number" min="1" aria-label={`Quantity of ${resource.name}`} disabled={!checked} className={`${inputClass} max-w-32`}
                      value={checked ? selection[resource.id] : ''} onChange={event => setSelection(current => ({ ...current, [resource.id]: event.target.value }))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DestinationStep({ shelters, shelterId, setShelterId }) {
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('All');
  const districts = useMemo(() => [...new Set(shelters.map(item => item.district))].sort(), [shelters]);
  const rows = filterShelters(shelters, { query, district });
  return (
    <>
      <h2 className="mb-3 text-base font-bold text-slate-800">Select Destination Shelter</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search shelters" className={`${inputClass} pl-9`} placeholder="Search shelters…" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <Select label="District" value={district} onChange={setDistrict} options={districts} allLabel="All Districts" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 py-2" /><th>Shelter Name</th><th>District</th><th className="text-right">Current Occupancy</th><th className="text-right">Available</th><th className="pl-4">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(item => {
              const blocked = item.status !== 'Active';
              return (
                <tr key={item.id} className={blocked ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'} onClick={() => !blocked && setShelterId(item.id)}>
                  <td className="py-2"><input type="radio" name="shelter" aria-label={`Select ${item.name}`} disabled={blocked} checked={shelterId === item.id} onChange={() => setShelterId(item.id)} /></td>
                  <td className="font-medium text-slate-800">{item.name}</td>
                  <td>{item.district}</td>
                  <td className={`text-right ${item.status === 'Full' ? 'font-semibold text-rose-600' : ''}`}>{item.occupied.toLocaleString()} / {item.capacity.toLocaleString()}</td>
                  <td className="text-right">{item.available.toLocaleString()}</td>
                  <td className="pl-4"><StatusBadge status={item.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Full and inactive shelters cannot receive allocations. Choose another shelter.</p>
    </>
  );
}

function Summary({ shelter, items, details }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination</div>
        <div className="font-semibold text-slate-800">{shelter?.name}</div>
        <div className="text-slate-500">{shelter?.district} District · {shelter?.available.toLocaleString()} places available</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resources</div>
        <ul>{items.map(item => <li key={item.id} className="flex justify-between"><span>{item.name}</span><span className="font-semibold">{item.quantity.toLocaleString()} {item.unit}</span></li>)}</ul>
      </div>
      {details.distributionDate && <div className="flex justify-between"><span className="text-slate-500">Distribution Date</span><span>{formatDate(details.distributionDate)}</span></div>}
      {details.transportMethod && <div className="flex justify-between"><span className="text-slate-500">Transport Method</span><span>{details.transportMethod}</span></div>}
      {details.expectedPeople !== '' && <div className="flex justify-between"><span className="text-slate-500">Expected People</span><span>{Number(details.expectedPeople).toLocaleString()}</span></div>}
      <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status="PENDING" /></div>
    </div>
  );
}

function DetailsStep({ details, setDetails, errors, shelter, items }) {
  const set = key => event => setDetails(current => ({ ...current, [key]: event.target.value }));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800">Allocation Information</h2>
        <Field label="Distribution Date" required error={errors.distributionDate}><input type="date" min={today()} className={inputClass} value={details.distributionDate} onChange={set('distributionDate')} /></Field>
        <Field label="Transport Method" required error={errors.transportMethod}>
          <select className={inputClass} value={details.transportMethod} onChange={set('transportMethod')}><option value="">Select transport method</option>{TRANSPORT_METHODS.map(item => <option key={item}>{item}</option>)}</select>
        </Field>
        <Field label="Expected People (evacuees arriving with this delivery)" error={errors.expectedPeople}><input type="number" min="0" className={inputClass} value={details.expectedPeople} onChange={set('expectedPeople')} /></Field>
        <Field label="Notes" error={errors.notes}>
          <textarea rows="4" maxLength="300" className={inputClass} placeholder="Enter notes (optional)" value={details.notes} onChange={set('notes')} />
          <span className="block text-right text-xs text-slate-400">{details.notes.length}/300</span>
        </Field>
      </div>
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800">Summary</h2>
        <Summary shelter={shelter} items={items} details={details} />
      </div>
    </div>
  );
}

function ReviewStep({ details, shelter, items }) {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h2 className="text-base font-bold text-slate-800">Review Allocation</h2>
      <p className="text-sm text-slate-600">Confirming reserves the stock below and records the allocation as pending.</p>
      <Summary shelter={shelter} items={items} details={details} />
      {details.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold">Notes: </span>{details.notes}</p>}
    </div>
  );
}
