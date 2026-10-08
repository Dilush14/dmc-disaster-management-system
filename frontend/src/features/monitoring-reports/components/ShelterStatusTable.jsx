export default function ShelterStatusTable({ shelters = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Shelter Name</th>
            <th className="px-4 py-3 font-semibold">District</th>
            <th className="px-4 py-3 font-semibold">Capacity</th>
            <th className="px-4 py-3 font-semibold">Occupied</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {shelters.map((shelter, index) => (
            <tr key={`${shelter.name}-${index}`} className="border-t border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-800">{shelter.name}</td>
              <td className="px-4 py-3 text-slate-600">{shelter.district}</td>
              <td className="px-4 py-3 text-slate-600">{shelter.capacity}</td>
              <td className="px-4 py-3 text-slate-600">{shelter.occupied}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${shelter.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : shelter.status === 'Full' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                  {shelter.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button type="button" className="text-sm font-medium text-blue-700 hover:text-blue-900">View on Map</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
