// TODO: filters should query `profiles` grouped by account_status;
// the table should list all profiles with role, status, last_active.

const filters = ['Total Users', 'Active', 'Inactive', 'Blocked']

export default function UserManagementPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">User Management</h1>

      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            className="border rounded-full px-4 py-1.5 text-sm hover:bg-gray-100"
          >
            {filter}
          </button>
        ))}
      </div>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Name / Email</th>
            <th className="p-3">Assigned Role</th>
            <th className="p-3">Account Status</th>
            <th className="p-3">Last Active</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-3">Sample User — sample@email.com</td>
            <td className="p-3">Parent</td>
            <td className="p-3">Active</td>
            <td className="p-3">—</td>
            <td className="p-3 space-x-3">
              <button className="text-sm underline">Edit</button>
              <button className="text-sm underline text-red-600">Block</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
