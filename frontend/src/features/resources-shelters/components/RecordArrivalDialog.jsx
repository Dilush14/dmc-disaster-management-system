import { useState } from 'react';
import { MapPinCheck } from 'lucide-react';
import { getShelter, recordTeamArrival } from '../services/resourcesSheltersService';
import { checkShelterCapacity, peopleLabel, previewArrival, validateArrival } from '../utils/resourcesShelters';
import { CapacityWarningDialog } from './WarningDialogs';
import { ErrorBanner, Field, inputClass, Loading, Modal, PrimaryButton, SecondaryButton, useAsync } from './ui';

const count = value => Number(value).toLocaleString();

/** Records how many evacuees a team delivered. The shelter values shown stay as loaded until the officer retries. */
export default function RecordArrivalDialog({ assignment, onClose, onRecorded }) {
  const shelter = useAsync(signal => getShelter(assignment.shelterId, { signal }), [assignment.shelterId]);
  const [delivered, setDelivered] = useState(String(assignment.expectedEvacuees ?? ''));
  const [fieldError, setFieldError] = useState('');
  const [warning, setWarning] = useState(null);
  const [failure, setFailure] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const problem = validateArrival(delivered);
    setFieldError(problem);
    if (problem) return;
    const capacityWarning = checkShelterCapacity(shelter.data, delivered);
    if (capacityWarning) {
      setWarning(capacityWarning);
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      onRecorded(await recordTeamArrival(assignment.id, { evacueesDelivered: Number(delivered), expectedOccupancy: Number(shelter.data.occupied) }));
    } catch (error) {
      setFailure({ message: error.message, stale: error.status === 409 });
    } finally {
      setSubmitting(false);
    }
  };

  // A 409 means the shelter changed or filled up: reload its values before trying again; otherwise resend as is.
  const retry = () => {
    if (failure?.stale) {
      setFailure(null);
      shelter.reload();
    } else {
      submit();
    }
  };

  if (warning) {
    return (
      <CapacityWarningDialog
        warning={warning}
        expectedLabel="Evacuees Delivered"
        actionLabel="Adjust Number"
        onClose={onClose}
        onViewAlternatives={() => { setDelivered(String(warning.available)); setWarning(null); }}
      />
    );
  }

  const preview = shelter.data && !validateArrival(delivered) ? previewArrival(shelter.data, delivered) : null;

  return (
    <Modal
      title="Record Arrival"
      icon={<MapPinCheck size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={!shelter.data || submitting} onClick={submit}>{submitting ? 'Recording…' : 'Record Arrival'}</PrimaryButton></>}
    >
      <p className="mb-4 text-sm text-slate-600">{assignment.teamName} has arrived at {assignment.shelterName}. Confirm how many evacuees were delivered.</p>
      {shelter.error && !shelter.data && <ErrorBanner message={`Shelter information is unavailable. ${shelter.error}`} onRetry={shelter.reload} />}
      {!shelter.data && !shelter.error && <Loading label="Loading shelter…" />}
      {shelter.data && (
        <div className="space-y-4">
          <Field label="Evacuees Delivered" required error={fieldError}>
            <input type="number" min="0" step="1" value={delivered} onChange={event => setDelivered(event.target.value)} className={inputClass} />
          </Field>
          {preview && (
            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${preview.exceedsCapacity ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-800'}`}>
              {preview.exceedsCapacity
                ? <>Exceeds capacity by {peopleLabel(preview.overBy)}. Only {peopleLabel(preview.before.available)} can be accommodated.</>
                : <>Occupancy {count(preview.before.occupied)} → {count(preview.after.occupied)}, available {count(preview.before.available)} → {count(preview.after.available)}</>}
              <span className="block text-xs font-normal opacity-80">Capacity {count(shelter.data.capacity)}</span>
            </p>
          )}
          {failure && <ErrorBanner message={failure.stale ? `${failure.message} Retry loads the latest shelter values.` : failure.message} onRetry={retry} />}
        </div>
      )}
    </Modal>
  );
}
