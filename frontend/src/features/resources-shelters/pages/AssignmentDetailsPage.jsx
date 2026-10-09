import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MapPinCheck, Radio, Send, XCircle } from 'lucide-react';
import { cancelTeamAssignment, dispatchTeamAssignment, getTeamAssignment, markAssignmentResponding } from '../services/resourcesSheltersService';
import { canCancelAssignment, canDispatchAssignment, canMarkResponding, canRecordArrival } from '../utils/resourcesShelters';
import { Card, ErrorBanner, formatDateTime, Loading, Modal, PrimaryButton, SecondaryButton, StatusBadge, useAsync } from '../components/ui';
import RecordArrivalDialog from '../components/RecordArrivalDialog';

const actions = {
  cancel: { run: cancelTeamAssignment, success: 'Assignment cancelled and the team released.' },
  dispatch: { run: dispatchTeamAssignment, success: 'Team dispatched.' },
  responding: { run: markAssignmentResponding, success: 'Team marked as responding.' },
};

export default function AssignmentDetailsPage() {
  const { assignmentId } = useParams();
  const { data: assignment, error, loading, reload, setData } = useAsync(signal => getTeamAssignment(assignmentId, { signal }), [assignmentId]);
  // confirming: null | 'cancel' | 'dispatch'; busy: the action currently running.
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [success, setSuccess] = useState('');
  // The shelter's before/after values from the last recorded arrival.
  const [arrival, setArrival] = useState(null);

  if (error && !assignment) return <ErrorBanner message={`Assignment information is unavailable. ${error}`} onRetry={reload} />;
  if (loading && !assignment) return <Loading label="Loading assignment…" />;

  const perform = async kind => {
    setBusy(kind);
    setActionError(null);
    setSuccess('');
    setArrival(null);
    try {
      setData(await actions[kind].run(assignment.id));
      setSuccess(actions[kind].success);
    } catch (failure) {
      setActionError({ kind, message: failure.message });
      if (failure.status === 409) reload();
    } finally {
      setConfirming(null);
      setBusy(null);
    }
  };

  const rows = [
    ['Rescue Team', <Link key="team" to="/staff/resources-shelters/teams" className="text-blue-700">{assignment.teamName}</Link>],
    ['Destination Shelter', <Link key="shelter" to={`/staff/resources-shelters/shelters/${encodeURIComponent(assignment.shelterId)}`} className="text-blue-700">{assignment.shelterName}</Link>],
    ['District', assignment.district],
    ['Expected Evacuees', Number(assignment.expectedEvacuees).toLocaleString()],
    ['Evacuees Delivered', Number(assignment.evacueesDelivered || 0).toLocaleString()],
    ['Pickup Location', assignment.pickupLocation],
    ['Assigned', formatDateTime(assignment.assignedAt)],
    ['Dispatched', formatDateTime(assignment.dispatchedAt)],
    ['Arrived', formatDateTime(assignment.arrivedAt)],
    ['Completed', formatDateTime(assignment.completedAt)],
  ];
  const history = [...(assignment.history || [])].reverse();

  return (
    <div className="space-y-6">
      <Link to="/staff/resources-shelters/teams/assignments" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft size={16} />Back to assignments</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900">{assignment.id}</h1>
          <StatusBadge status={assignment.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {canDispatchAssignment(assignment) && <PrimaryButton disabled={!!busy} onClick={() => setConfirming('dispatch')}><Send size={16} />Dispatch Team</PrimaryButton>}
          {canMarkResponding(assignment) && <PrimaryButton disabled={!!busy} onClick={() => perform('responding')}><Radio size={16} />{busy === 'responding' ? 'Updating…' : 'Mark Responding'}</PrimaryButton>}
          {canRecordArrival(assignment) && <PrimaryButton disabled={!!busy} onClick={() => { setActionError(null); setSuccess(''); setConfirming('arrival'); }}><MapPinCheck size={16} />Record Arrival</PrimaryButton>}
          {canCancelAssignment(assignment) && (
          <button type="button" disabled={!!busy} onClick={() => setConfirming('cancel')} className="inline-flex items-center justify-center gap-2 rounded-lg border! border-rose-200! bg-white! px-4 py-2 text-sm font-semibold text-rose-700! hover:bg-rose-50!"><XCircle size={16} />Cancel Assignment</button>
          )}
        </div>
      </div>
      {success && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} />{success}</p>}
      {actionError && <ErrorBanner message={actionError.message} onRetry={() => perform(actionError.kind)} />}
      {arrival && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />Arrival recorded. {Number(arrival.assignment.evacueesDelivered).toLocaleString()} evacuees delivered to {arrival.shelterName}; {assignment.teamName} is available again.</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <dt className="text-emerald-700">Occupancy</dt><dd className="font-semibold">{Number(arrival.previousOccupied).toLocaleString()} → {Number(arrival.occupied).toLocaleString()} of {Number(arrival.capacity).toLocaleString()}</dd>
            <dt className="text-emerald-700">Available</dt><dd className="font-semibold">{Number(arrival.previousAvailable).toLocaleString()} → {Number(arrival.available).toLocaleString()}</dd>
          </dl>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Assignment Details">
          <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-y-2 text-sm">
            {rows.map(([label, value]) => <div key={label} className="contents"><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-800">{value || '—'}</dd></div>)}
          </dl>
          {assignment.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold">Notes: </span>{assignment.notes}</p>}
        </Card>
        <Card title="Timeline">
          <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
            {history.map((entry, index) => (
              <li key={`${entry.status}-${entry.at}-${index}`} className="relative">
                <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${index === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.status} /><span className="text-xs text-slate-500">{formatDateTime(entry.at)}</span></div>
                {entry.note && <p className="mt-1 text-sm text-slate-700">{entry.note}</p>}
                {entry.by && <p className="text-xs text-slate-400">by {entry.byName || 'staff officer'}</p>}
              </li>
            ))}
            {!history.length && <li className="text-sm text-slate-500">No status changes recorded.</li>}
          </ol>
        </Card>
      </div>

      {confirming === 'arrival' && (
        <RecordArrivalDialog
          assignment={assignment}
          onClose={() => setConfirming(null)}
          onRecorded={result => { setData(result.assignment); setArrival(result); setConfirming(null); }}
        />
      )}

      {confirming === 'dispatch' && (
        <Modal
          title="Dispatch Team"
          icon={<Send size={28} />}
          onClose={() => setConfirming(null)}
          footer={<><SecondaryButton onClick={() => setConfirming(null)}>Not Yet</SecondaryButton><PrimaryButton disabled={busy === 'dispatch'} onClick={() => perform('dispatch')}>{busy === 'dispatch' ? 'Dispatching…' : 'Dispatch Team'}</PrimaryButton></>}
        >
          <p className="text-sm text-slate-600">{assignment.teamName} will be sent to {assignment.pickupLocation} to move {Number(assignment.expectedEvacuees).toLocaleString()} evacuees to {assignment.shelterName}. The assignment can no longer be cancelled once dispatched.</p>
        </Modal>
      )}

      {confirming === 'cancel' && (
        <Modal
          title="Cancel Assignment"
          tone="red"
          icon={<XCircle size={28} />}
          onClose={() => setConfirming(null)}
          footer={<><SecondaryButton onClick={() => setConfirming(null)}>Keep Assignment</SecondaryButton><button type="button" disabled={busy === 'cancel'} onClick={() => perform('cancel')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600! px-4 py-2 text-sm font-semibold text-white! hover:bg-rose-700! disabled:cursor-not-allowed disabled:opacity-50">{busy === 'cancel' ? 'Cancelling…' : 'Cancel Assignment'}</button></>}
        >
          <p className="text-sm text-slate-600">{assignment.teamName} will be released and marked available for other assignments. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
