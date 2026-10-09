import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { assignTeam, listShelters, listTeams } from '../services/resourcesSheltersService';
import {
  assignmentConflictKind, checkShelterCapacity, filterShelters, filterTeams, validateAssignmentDetails, validateAssignmentShelter, validateAssignmentTeam,
} from '../utils/resourcesShelters';
import { CapacityWarningDialog } from '../components/WarningDialogs';
import ActiveResponseBanner from '../components/ActiveResponseBanner';
import { Card, ErrorBanner, Field, inputClass, Loading, PageHeader, PrimaryButton, SecondaryButton, Select, StatusBadge, Stepper, useAsync } from '../components/ui';

const steps = ['Select Shelter', 'Select Team', 'Pickup & Notes', 'Review'];

export default function AssignTeamPage() {
  const [params] = useSearchParams();
  const shelters = useAsync(signal => listShelters(undefined, { signal }), []);
  const teams = useAsync(signal => listTeams({ signal }), []);
  const [step, setStep] = useState(1);
  const [shelterId, setShelterId] = useState(params.get('shelterId') || '');
  const [teamId, setTeamId] = useState(params.get('teamId') || '');
  const [details, setDetails] = useState({ expectedEvacuees: '', pickupLocation: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [capacityWarning, setCapacityWarning] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recorded, setRecorded] = useState(null);

  const shelter = (shelters.data || []).find(item => item.id === shelterId);
  const team = (teams.data || []).find(item => item.id === teamId);

  const loadError = shelters.error || teams.error;
  if (loadError && (!shelters.data || !teams.data)) {
    return <div className="space-y-6"><PageHeader title="Assign Rescue Team" /><ErrorBanner message={`Shelter or team information is unavailable. ${loadError}`} onRetry={() => { shelters.reload(); teams.reload(); }} /></div>;
  }
  if (!shelters.data || !teams.data) return <div className="space-y-6"><PageHeader title="Assign Rescue Team" /><Loading /></div>;

  const reset = () => {
    setStep(1); setShelterId(''); setTeamId(''); setRecorded(null); setSubmitError('');
    setDetails({ expectedEvacuees: '', pickupLocation: '', notes: '' });
    shelters.reload(); teams.reload();
  };

  const goToTeam = () => {
    const found = validateAssignmentShelter(shelter, details.expectedEvacuees);
    setErrors(found);
    if (Object.keys(found).length) return;
    const warning = checkShelterCapacity(shelter, details.expectedEvacuees);
    if (warning) return setCapacityWarning(warning);
    setStep(2);
  };

  const goToDetails = () => {
    const problem = validateAssignmentTeam(team);
    setErrors({ teamId: problem });
    if (!problem) setStep(3);
  };

  const goToReview = () => {
    const found = validateAssignmentDetails(details);
    setErrors(found);
    if (!Object.keys(found).length) setStep(4);
  };

  const confirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      setRecorded(await assignTeam({
        teamId,
        shelterId,
        expectedEvacuees: Number(details.expectedEvacuees),
        pickupLocation: details.pickupLocation.trim(),
        notes: details.notes.trim(),
      }));
    } catch (failure) {
      const kind = assignmentConflictKind(failure);
      if (kind === 'team') {
        // Another officer took the team first: refresh and pick again.
        setSubmitError(`Team became unavailable. ${failure.message} Please choose another team.`);
        setTeamId('');
        setStep(2);
        teams.reload();
      } else if (kind === 'capacity') {
        // Occupancy changed since loading: show the latest numbers and go back to shelter selection.
        const latest = await listShelters().catch(() => null);
        if (latest) shelters.setData(latest);
        const fresh = (latest || shelters.data).find(item => item.id === shelterId) || shelter;
        // An inactive shelter has no usable space even if beds are free.
        const usable = fresh.status === 'Inactive' ? { ...fresh, occupied: fresh.capacity } : fresh;
        setCapacityWarning(checkShelterCapacity(usable, details.expectedEvacuees));
        setSubmitError(failure.message);
        setStep(1);
      } else {
        setSubmitError(failure.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (recorded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assign Rescue Team" />
        <Card className="mx-auto max-w-xl text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h2 className="mt-3 text-xl font-black text-slate-900">Team assigned</h2>
          <p className="mt-1 text-sm text-slate-600">{recorded.id} · {recorded.teamName} will move {Number(recorded.expectedEvacuees).toLocaleString()} evacuees from {recorded.pickupLocation} to {recorded.shelterName}.</p>
          <div className="mt-2"><StatusBadge status={recorded.status} /></div>
          <div className="mt-5 flex justify-center gap-2">
            <SecondaryButton onClick={reset}>New Assignment</SecondaryButton>
            <Link to={`/staff/resources-shelters/teams/assignments/${encodeURIComponent(recorded.id)}`} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">View Assignment</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assign Rescue Team" subtitle="Send an available rescue team to move evacuees to a shelter." />
      <ActiveResponseBanner district={shelter?.district} />
      <Card>
        <Stepper steps={steps} step={step} />
        {step === 1 && <ShelterStep shelters={shelters.data} shelterId={shelterId} setShelterId={setShelterId} details={details} setDetails={setDetails} errors={errors} />}
        {step === 2 && <TeamStep teams={teams.data} teamId={teamId} setTeamId={setTeamId} error={errors.teamId} district={team ? undefined : shelter?.district} />}
        {step === 3 && <DetailsStep details={details} setDetails={setDetails} errors={errors} shelter={shelter} team={team} />}
        {step === 4 && <ReviewStep details={details} shelter={shelter} team={team} />}
        {submitError && <div className="mt-4"><ErrorBanner message={submitError} /></div>}

        <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
          {step === 1 ? <Link to="/staff/resources-shelters/teams/assignments" className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</Link>
            : <SecondaryButton onClick={() => { setStep(step - 1); setErrors({}); }}><ArrowLeft size={16} />Back</SecondaryButton>}
          {step === 1 && <PrimaryButton onClick={goToTeam}>Next<ArrowRight size={16} /></PrimaryButton>}
          {step === 2 && <PrimaryButton onClick={goToDetails}>Next<ArrowRight size={16} /></PrimaryButton>}
          {step === 3 && <PrimaryButton onClick={goToReview}>Review Assignment</PrimaryButton>}
          {step === 4 && <PrimaryButton disabled={submitting} onClick={confirm}>{submitting ? 'Assigning…' : 'Confirm Assignment'}</PrimaryButton>}
        </div>
      </Card>

      {capacityWarning && (
        <CapacityWarningDialog
          warning={capacityWarning}
          onClose={() => setCapacityWarning(null)}
          onViewAlternatives={() => { setCapacityWarning(null); setShelterId(''); setStep(1); }}
        />
      )}
    </div>
  );
}

function ShelterStep({ shelters, shelterId, setShelterId, details, setDetails, errors }) {
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('All');
  const districts = useMemo(() => [...new Set(shelters.map(item => item.district))].sort(), [shelters]);
  const rows = filterShelters(shelters, { query, district });
  return (
    <>
      <h2 className="mb-3 text-base font-bold text-slate-800">Select Destination Shelter</h2>
      <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto_14rem] md:items-start">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search shelters" className={`${inputClass} pl-9`} placeholder="Search shelters…" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <Select label="District" value={district} onChange={setDistrict} options={districts} allLabel="All Districts" />
        <Field label="Expected Evacuees" required error={errors.expectedEvacuees}>
          <input type="number" min="1" className={inputClass} value={details.expectedEvacuees} onChange={event => setDetails(current => ({ ...current, expectedEvacuees: event.target.value }))} />
        </Field>
      </div>
      {errors.shelterId && <p className="mb-3 text-sm text-rose-600">{errors.shelterId}</p>}
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
      <p className="mt-2 text-xs text-slate-500">Full and inactive shelters cannot receive evacuees. Choose another shelter.</p>
    </>
  );
}

function TeamStep({ teams, teamId, setTeamId, error, district }) {
  const [query, setQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState(district || 'All');
  const districts = useMemo(() => [...new Set(teams.map(item => item.district))].sort(), [teams]);
  const rows = filterTeams(teams, { query, district: districtFilter, status: 'AVAILABLE' });
  return (
    <>
      <h2 className="mb-3 text-base font-bold text-slate-800">Select Available Rescue Team</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search teams" className={`${inputClass} pl-9`} placeholder="Search by team, leader or ID…" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <Select label="District" value={districtFilter} onChange={setDistrictFilter} options={districts} allLabel="All Districts" />
      </div>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 py-2" /><th>Team</th><th>Agency</th><th>District</th><th className="text-right">Members</th><th className="pl-4">Capabilities</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(item => (
              <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setTeamId(item.id)}>
                <td className="py-2"><input type="radio" name="team" aria-label={`Select ${item.name}`} checked={teamId === item.id} onChange={() => setTeamId(item.id)} /></td>
                <td><div className="font-medium text-slate-800">{item.name}</div><div className="text-xs text-slate-400">{item.leader} · {item.contactNumber}</div></td>
                <td>{item.agency}</td>
                <td>{item.district}</td>
                <td className="text-right">{item.memberCount}</td>
                <td className="pl-4 text-xs text-slate-600">{(item.capabilities || []).join(', ')}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="6" className="py-8 text-center text-slate-500">No available teams match these filters. Try another district.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Summary({ shelter, team, details }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination</div>
        <div className="font-semibold text-slate-800">{shelter?.name}</div>
        <div className="text-slate-500">{shelter?.district} District · {shelter?.available.toLocaleString()} places available</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rescue Team</div>
        <div className="font-semibold text-slate-800">{team?.name}</div>
        <div className="text-slate-500">{team?.agency} · {team?.memberCount} members · {team?.leader}</div>
      </div>
      <div className="flex justify-between"><span className="text-slate-500">Expected Evacuees</span><span>{Number(details.expectedEvacuees).toLocaleString()}</span></div>
      {details.pickupLocation && <div className="flex justify-between gap-4"><span className="text-slate-500">Pickup Location</span><span className="text-right">{details.pickupLocation}</span></div>}
      <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status="ASSIGNED" /></div>
    </div>
  );
}

function DetailsStep({ details, setDetails, errors, shelter, team }) {
  const set = key => event => setDetails(current => ({ ...current, [key]: event.target.value }));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800">Pickup & Notes</h2>
        <Field label="Pickup Location" required error={errors.pickupLocation}>
          <input maxLength="200" className={inputClass} placeholder="Where the team collects evacuees" value={details.pickupLocation} onChange={set('pickupLocation')} />
        </Field>
        <Field label="Notes" error={errors.notes}>
          <textarea rows="4" maxLength="300" className={inputClass} placeholder="Enter notes (optional)" value={details.notes} onChange={set('notes')} />
          <span className="block text-right text-xs text-slate-400">{details.notes.length}/300</span>
        </Field>
      </div>
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800">Summary</h2>
        <Summary shelter={shelter} team={team} details={details} />
      </div>
    </div>
  );
}

function ReviewStep({ details, shelter, team }) {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h2 className="text-base font-bold text-slate-800">Review Assignment</h2>
      <p className="text-sm text-slate-600">Confirming re-checks shelter space and team availability, then marks the team as assigned.</p>
      <Summary shelter={shelter} team={team} details={details} />
      {details.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold">Notes: </span>{details.notes}</p>}
    </div>
  );
}
