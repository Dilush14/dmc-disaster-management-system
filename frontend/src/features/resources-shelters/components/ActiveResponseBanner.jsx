import { Siren } from 'lucide-react';
import { getActiveResponses } from '../services/resourcesSheltersService';
import { describeResponse } from '../utils/resourcesShelters';
import { ErrorBanner, formatDateTime, useAsync } from './ui';

/** The emergency response(s) the officer is coordinating shelters and resources for. */
export default function ActiveResponseBanner({ district }) {
  const { data, error, loading, reload } = useAsync(signal => getActiveResponses(district, { signal }), [district]);

  if (error) return <ErrorBanner message={`Active emergency response is unavailable. ${error}`} onRetry={reload} />;
  if (loading && !data) return null;
  if (!data?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No active emergency response. Shelters and resources are shown for routine coordination.
      </div>
    );
  }
  return (
    <div className="space-y-3">
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
            <span className="text-xs font-semibold text-rose-700">Active since {formatDateTime(response.startedAt)}</span>
          </section>
        );
      })}
    </div>
  );
}
