export default function ReportPreview({ config, report = null }) {
  const sections = report?.sections || config.selectedSections || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">Report Structure</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          {sections.map((section, index) => (
            <li key={`${section}-${index}`} className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">{section}</li>
          ))}
        </ul>
      </aside>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 border-b border-slate-200 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Disaster Response Report</div>
          <h3 className="mt-2 text-3xl font-black text-slate-900">Sri Lanka</h3>
          <div className="mt-2 text-sm text-slate-500">{config.dateFrom} to {config.dateTo} · {config.district}</div>
        </div>

        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Preview layout only. Operational figures are loaded and validated when the report is generated; unavailable required data will stop generation.
        </p>

        <div className="space-y-5">
          <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Executive Summary</h4>
            <p className="text-sm leading-6 text-slate-600">The district response remains active with ongoing hazard warnings, shelter readiness, and multi-agency resource distribution across the operational region. Verified case reports continue to be monitored and response teams remain on standby for rapid intervention.</p>
          </section>

          <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Alert Timeline</h4>
            <div className="grid gap-3 md:grid-cols-3">
              {(report?.alertTimeline || []).slice(0, 3).map((entry, index) => (
                <div key={`${entry.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{entry.type}</div>
                  <div className="mt-1 font-semibold text-slate-800">{entry.title}</div>
                  <div className="mt-2 text-xs text-slate-500">{entry.date}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Citizens Reached</h4>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(report?.citizensReached || []).slice(0, 4).map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-200 bg-blue-50 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-blue-700">{item.label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Shelter Occupancy Trend</h4>
            <div className="flex h-28 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {(report?.shelterOccupancy || []).map((entry, index) => (
                <div key={`${entry.period}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-xl bg-blue-600" style={{ height: `${entry.occupancy}%` }} />
                  <span className="text-[11px] text-slate-500">{entry.period}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Resource Distribution by District</h4>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">District</th>
                    <th className="px-3 py-2 font-semibold">Resource</th>
                    <th className="px-3 py-2 font-semibold">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.resourceDistribution || []).slice(0, 3).map((entry, index) => (
                    <tr key={`${entry.resource}-${index}`} className="border-t border-slate-200">
                      <td className="px-3 py-2">{entry.district}</td>
                      <td className="px-3 py-2">{entry.resource}</td>
                      <td className="px-3 py-2">{entry.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
