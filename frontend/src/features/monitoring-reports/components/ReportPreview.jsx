export default function ReportPreview({ config, report = null }) {
  const sections = report?.sections || config.selectedSections || [];
  const emptyMessage = 'No operational records matched this district and date range.';
  const timeline = report?.alertTimeline || [];
  const reached = report?.citizensReached || [];
  const occupancy = report?.shelterOccupancy || [];
  const distributions = report?.resourceDistribution || [];

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
          <h3 className="mt-2 text-3xl font-black text-slate-900">{report?.reportType || config.reportType}</h3>
          <div className="mt-2 text-sm text-slate-500">{report?.period || `${config.dateFrom} to ${config.dateTo}`} · {report?.district || config.district}</div>
        </div>

        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Preview figures are read from live hazard, shelter, and distribution records. Empty sections are shown as empty; no sample values are inserted.
        </p>

        <div className="space-y-5">
          {sections.includes('Verified Hazard Reports') && <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Verified Hazard Reports</h4>
            <p className="text-sm text-slate-600">{report?.verifiedReportCount ?? 0} verified reports in the selected period.</p>
          </section>}

          {sections.includes('Hazard Warnings') && <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Alert Timeline</h4>
            {timeline.length ? <div className="space-y-2">
              {timeline.map((entry, index) => <div key={`${entry.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{entry.type}</div>
                <div className="mt-1 font-semibold text-slate-800">{entry.title || 'Hazard record'}</div>
                <div className="mt-2 text-xs text-slate-500">{entry.date}</div>
              </div>)}
            </div> : <p className="text-sm text-slate-500">{emptyMessage}</p>}
          </section>}

          {sections.includes('Citizens Reached') && <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Citizens Reached</h4>
            {reached.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reached.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-200 bg-blue-50 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-blue-700">{item.label || 'Completed distribution'}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{Number(item.value || 0).toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-500">{item.district} · {item.date}</div>
                {item.basis && <div className="mt-1 text-xs text-slate-500">{item.basis}</div>}
              </div>)}
            </div> : <p className="text-sm text-slate-500">{emptyMessage}</p>}
          </section>}

          {sections.includes('Shelter Occupancy') && <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Shelter Occupancy</h4>
            {occupancy.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr>
                <th className="px-3 py-2">Shelter</th><th className="px-3 py-2">District</th><th className="px-3 py-2">Occupancy / Capacity</th><th className="px-3 py-2">Recorded</th>
              </tr></thead><tbody>{occupancy.map((entry, index) => <tr key={`${entry.shelterId}-${index}`} className="border-t border-slate-200">
                <td className="px-3 py-2">{entry.shelterName}</td><td className="px-3 py-2">{entry.district}</td><td className="px-3 py-2">{entry.occupancy} / {entry.capacity}</td><td className="px-3 py-2">{entry.recordedAt}</td>
              </tr>)}</tbody></table>
            </div> : <p className="text-sm text-slate-500">{emptyMessage}</p>}
          </section>}

          {sections.includes('Resource Distribution') && <section>
            <h4 className="mb-2 text-lg font-bold text-slate-800">Resource Distribution by District</h4>
            {distributions.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr>
                <th className="px-3 py-2">District</th><th className="px-3 py-2">Shelter</th><th className="px-3 py-2">Items</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th>
              </tr></thead><tbody>{distributions.map((entry, index) => <tr key={`${entry.id}-${index}`} className="border-t border-slate-200">
                <td className="px-3 py-2">{entry.district}</td><td className="px-3 py-2">{entry.shelterName}</td>
                <td className="px-3 py-2">{(entry.items || []).map(item => `${item.name}: ${item.quantity}`).join(', ')}</td>
                <td className="px-3 py-2">{entry.status}</td><td className="px-3 py-2">{entry.distributionDate || entry.createdAt}</td>
              </tr>)}</tbody></table>
            </div> : <p className="text-sm text-slate-500">{emptyMessage}</p>}
          </section>}
        </div>
      </div>
    </div>
  );
}
