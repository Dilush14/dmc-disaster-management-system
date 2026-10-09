import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, XCircle } from 'lucide-react';
import { cancelTeamAssignment, getTeamAssignment } from '../services/resourcesSheltersService';
import { canCancelAssignment } from '../utils/resourcesShelters';
import { Card, ErrorBanner, formatDateTime, Loading, Modal, SecondaryButton, StatusBadge, useAsync } from '../components/ui';

export default function AssignmentDetailsPage() {
  const { assignmentId } = useParams();
  const { data: assignment, error, loading, reload, setData } = useAsync(signal => getTeamAssignment(assignmentId, { signal }), [assignmentId]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  if (error && !assignment) return <ErrorBanner message={`Assignment information is unavailable. ${error}`} onRetry={reload} />;
  if (loading && !assignment) return <Loading label="Loading assignment…" />;

  const cancel = async () => {
    setCancelling(true);
    setActionError('');
    try {
      setData(await cancelTeamAssignment(assignment.id));
      setConfirming(false);
    } catch (failure) {
      setActionError(failure.message);
      setConfirming(false);
      if (failure.status === 409) reload();
    } finally {
      setCancelling(false);
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
        {canCancelAssignment(assignment) && (
          <SecondaryButton onClick={() => setConfirming(true)} className="text-rose-700"><XCircle size={16} />Cancel Assignment</SecondaryButton>
        )}
      </div>
      {actionError && <ErrorBanner message={actionError} />}

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
                {entry.by && <p className="text-xs text-slate-400">by {entry.by}</p>}
              </li>
            ))}
            {!history.length && <li className="text-sm text-slate-500">No status changes recorded.</li>}
          </ol>
        </Card>
      </div>

      {confirming && (
        <Modal
          title="Cancel Assignment"
          tone="red"
          icon={<XCircle size={28} />}
          onClose={() => setConfirming(false)}
          footer={<><SecondaryButton onClick={() => setConfirming(false)}>Keep Assignment</SecondaryButton><button type="button" disabled={cancelling} onClick={cancel} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{cancelling ? 'Cancelling…' : 'Cancel Assignment'}</button></>}
        >
          <p className="text-sm text-slate-600">{assignment.teamName} will be released and marked available for other assignments. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
