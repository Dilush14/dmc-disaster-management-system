import { useState } from 'react';
import { Users } from 'lucide-react';
import { addAssignmentSupport, listResources, listTeams } from '../services/resourcesSheltersService';
import { checkStock, MAX_SUPPORT_TEAMS, supportResourcePayload, validateSupportRequest } from '../utils/resourcesShelters';
import { StockWarningDialog } from './WarningDialogs';
import { SupportResourcePicker, SupportTeamPicker } from './SupportPickers';
import { ErrorBanner, Loading, Modal, PrimaryButton, SecondaryButton, useAsync } from './ui';

/** Adds support teams and relief stock to an assigned or dispatched team. */
export default function AddSupportDialog({ assignment, onClose, onAdded }) {
  const teams = useAsync(signal => listTeams({ signal }), []);
  const resources = useAsync(signal => listResources({ signal }), []);
  const [teamIds, setTeamIds] = useState([]);
  const [selection, setSelection] = useState({});
  const [problem, setProblem] = useState('');
  const [stockWarning, setStockWarning] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const existing = assignment.supportTeamIds || [];

  const submit = async () => {
    const found = validateSupportRequest(teamIds, selection);
    setProblem(found);
    if (found) return;
    const warning = checkStock(selection, resources.data || []);
    if (warning) return setStockWarning(warning);
    setSaving(true);
    setSubmitError('');
    try {
      onAdded(await addAssignmentSupport(assignment.id, { supportTeamIds: teamIds, supportResources: supportResourcePayload(selection) }));
    } catch (failure) {
      setSubmitError(failure.message);
      // Teams or stock changed since loading: show the latest so the officer can adjust.
      if (failure.status === 409) { setTeamIds([]); teams.reload(); resources.reload(); }
    } finally {
      setSaving(false);
    }
  };

  const loadError = teams.error || resources.error;
  return (
    <>
      <Modal
        title="Add Support"
        icon={<Users size={28} />}
        onClose={onClose}
        footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={saving || !teams.data || !resources.data} onClick={submit}>{saving ? 'Adding…' : 'Add Support'}</PrimaryButton></>}
      >
        {loadError && (!teams.data || !resources.data) ? <ErrorBanner message={`Teams or resources are unavailable. ${loadError}`} onRetry={() => { teams.reload(); resources.reload(); }} />
          : !teams.data || !resources.data ? <Loading />
            : (
              <div className="space-y-5 text-left">
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Support Teams</h3>
                  <SupportTeamPicker teams={teams.data} primaryTeamId={assignment.teamId} excludeIds={existing} selected={teamIds} onChange={setTeamIds}
                    limit={Math.max(0, MAX_SUPPORT_TEAMS - existing.length)} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Support Resources</h3>
                  <SupportResourcePicker resources={resources.data} selection={selection} onChange={setSelection} />
                </div>
                {problem && <p className="text-sm text-rose-600">{problem}</p>}
                {submitError && <ErrorBanner message={submitError} />}
              </div>
            )}
      </Modal>
      {stockWarning && (
        <StockWarningDialog
          warning={stockWarning}
          onClose={() => setStockWarning(null)}
          onAdjust={() => { setSelection(current => ({ ...current, [stockWarning.resourceId]: String(stockWarning.available) })); setStockWarning(null); }}
        />
      )}
    </>
  );
}
