// TODO: the "Review Application" button should open a slide-over panel
// (Applicant Summary + Document Verification) — build that as a separate
// client component once this shell is wired to real data.

const statusFilters = [
  'All Applications',
  'Pending Document Review',
  'Needs Correction',
  'Approved Today',
]

export default function ApplicationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Applications</h1>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              className="border rounded-full px-4 py-1.5 text-sm hover:bg-gray-100"
            >
              {filter}
            </button>
          ))}
        </div>

        <select className="border rounded px-3 py-1.5 text-sm">
          <option>Date Applied: Newest</option>
          <option>Date Applied: Oldest</option>
        </select>
      </div>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Application Ref</th>
            <th className="p-3">Student Name</th>
            <th className="p-3">Parent / Guardian</th>
            <th className="p-3">Documents</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-3">APP-2026-0001</td>
            <td className="p-3">Sample Student</td>
            <td className="p-3">Sample Parent</td>
            <td className="p-3">4/4 uploaded</td>
            <td className="p-3">Pending Document Review</td>
            <td className="p-3">
              <button className="text-sm underline">Review Application</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
