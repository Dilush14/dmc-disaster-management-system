import { useState } from 'react';
import { AlertOctagon, ArrowUpCircle, RefreshCw, Send, UserRoundCog } from 'lucide-react';
import { escalateCommFailure, listTeams, reassignTeamAssignment, redispatchTeamAssignment } from '../services/resourcesSheltersService';
import { reassignTeamOptions, validateEscalationNote } from '../utils/resourcesShelters';
import { ErrorBanner, Field, formatDateTime, inputClass, Loading, Modal, PrimaryButton, SecondaryButton, useAsync } from './ui';

const redButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600! px-4 py-2 text-sm font-semibold text-white! hover:bg-rose-700! disabled:cursor-not-allowed disabled:opacity-50';
const outlineRedButton = 'inline-flex items-center justify-center gap-2 rounded-lg border! border-rose-300! bg-white! px-4 py-2 text-sm font-semibold text-rose-700! hover:bg-rose-50! disabled:cursor-not-allowed disabled:opacity-50';

/** Shown while an assignment's team cannot be reached: escalate, re-dispatch the same team, or hand over to another team. */
export default function CommFailurePanel({ assignment, onUpdated }) {
  // dialog: null | 'escalate' | 'redispatch' | 'reassign'
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);
  const done = (updated, message) => { onUpdated(updated, message); close(); };

  return (
    <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertOctagon size={24} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <h2 className="text-base font-bold text-rose-800">Communication Failure</h2>
            <p className="text-sm text-rose-700">Contact with {assignment.teamName} was lost {formatDateTime(assignment.commFailureAt)}.</p>
            {assignment.escalatedAt && (
              <p className="mt-2 text-sm text-rose-800">
                <span className="font-semibold">Escalated {formatDateTime(assignment.escalatedAt)}{assignment.escalatedByName ? ` by ${assignment.escalatedByName}` : ''}: </span>
                {assignment.escalationNote}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!assignment.escalatedAt && <button type="button" onClick={() => setDialog('escalate')} className={outlineRedButton}><ArrowUpCircle size={16} />Escalate</button>}
          <button type="button" onClick={() => setDialog('redispatch')} className={outlineRedButton}><RefreshCw size={16} />Re-dispatch</button>
          <button type="button" onClick={() => setDialog('reassign')} className={redButton}><UserRoundCog size={16} />Reassign</button>
        </div>
      </div>

      {dialog === 'escalate' && <EscalateDialog assignment={assignment} onClose={close} onDone={updated => done(updated, 'Failure escalated to senior officers.')} />}
      {dialog === 'redispatch' && <RedispatchDialog assignment={assignment} onClose={close} onDone={updated => done(updated, 'Team re-dispatched; the alert has been resolved.')} />}
      {dialog === 'reassign' && <ReassignDialog assignment={assignment} onClose={close} onDone={updated => done(updated, `${updated.teamName} dispatched in place of ${updated.previousTeamName}; the alert has been resolved.`)} />}
    </section>
  );
}

function EscalateDialog({ assignment, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submit = async () => {
    const found = validateEscalationNote(note);
    setProblem(found);
    if (found) return;
    setSaving(true);
    setSubmitError('');
    try {
      onDone(await escalateCommFailure(assignment.id, note.trim()));
    } catch (failure) {
      setSubmitError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Escalate Failure"
      tone="red"
      icon={<ArrowUpCircle size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><button type="button" disabled={saving} onClick={submit} className={redButton}>{saving ? 'Escalating…' : 'Escalate'}</button></>}
    >
      <div className="space-y-3 text-left">
        <p className="text-sm text-slate-600">Senior officers will be alerted that {assignment.teamName} cannot be reached.</p>
        <Field label="Note" required error={problem}>
          <textarea rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} className={inputClass} placeholder="Last known position, attempts made…" />
        </Field>
        {submitError && <ErrorBanner message={submitError} onRetry={submit} />}
      </div>
    </Modal>
  );
}

function RedispatchDialog({ assignment, onClose, onDone }) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submit = async () => {
    setSaving(true);
    setSubmitError('');
    try {
      onDone(await redispatchTeamAssignment(assignment.id));
    } catch (failure) {
      setSubmitError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Re-dispatch Team"
      icon={<Send size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={saving} onClick={submit}>{saving ? 'Re-dispatching…' : 'Re-dispatch'}</PrimaryButton></>}
    >
      <p className="text-sm text-slate-600">Use this once contact with {assignment.teamName} has been restored. The team will be marked dispatched again and the alert resolved.</p>
      {submitError && <div className="mt-3"><ErrorBanner message={submitError} onRetry={submit} /></div>}
    </Modal>
  );
}

function ReassignDialog({ assignment, onClose, onDone }) {
  const teams = useAsync(signal => listTeams({ signal }), []);
  const [teamId, setTeamId] = useState('');
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const options = reassignTeamOptions(teams.data, assignment);

  const submit = async () => {
    if (!teamId) return setProblem('Choose a replacement team.');
    setProblem('');
    setSaving(true);
    setSubmitError('');
    try {
      onDone(await reassignTeamAssignment(assignment.id, teamId));
    } catch (failure) {
      setSubmitError(failure.message);
      // The chosen team was taken in the meantime: refresh the list.
      if (failure.status === 409) { setTeamId(''); teams.reload(); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Reassign Team"
      tone="red"
      icon={<UserRoundCog size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><button type="button" disabled={saving || !teams.data} onClick={submit} className={redButton}>{saving ? 'Reassigning…' : 'Reassign & Dispatch'}</button></>}
    >
      <div className="space-y-3 text-left">
        <p className="text-sm text-slate-600">{assignment.teamName} will be marked unavailable and the chosen team dispatched to {assignment.pickupLocation}.</p>
        {teams.error && !teams.data ? <ErrorBanner message={`Teams are unavailable. ${teams.error}`} onRetry={teams.reload} />
          : !teams.data ? <Loading />
            : options.length ? (
              <Field label="Replacement Team" required error={problem}>
                <select value={teamId} onChange={event => setTeamId(event.target.value)} className={inputClass}>
                  <option value="">Select an available team</option>
                  {options.map(team => <option key={team.id} value={team.id}>{team.name} · {team.agency} · {team.district}</option>)}
                </select>
              </Field>
            ) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No teams are available right now. Escalate the failure or try again later.</p>}
        {submitError && <ErrorBanner message={submitError} />}
      </div>
    </Modal>
  );
}
