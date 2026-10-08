export default function GeneratedReportTable({ reports = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Report Name</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Period</th>
            <th className="px-4 py-3 font-semibold">Generated On</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={`${report.reportName}-${index}`} className="border-t border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-800">{report.reportName}</td>
              <td className="px-4 py-3 text-slate-600">{report.type}</td>
              <td className="px-4 py-3 text-slate-600">{report.period}</td>
              <td className="px-4 py-3 text-slate-600">{report.generatedOn}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2 text-xs">
                  <button type="button" className="rounded-md bg-blue-600 px-2 py-1 font-medium text-white">View</button>
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700">Download</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
