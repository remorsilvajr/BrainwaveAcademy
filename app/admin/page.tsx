export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Pending Applications</p>
          <p className="text-2xl font-semibold mt-1">0</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Active Student Enrollment</p>
          <p className="text-2xl font-semibold mt-1">0</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Unsolved Feedback</p>
          <p className="text-2xl font-semibold mt-1">0</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Recent Financial Transactions</p>
          <p className="text-2xl font-semibold mt-1">₱0.00</p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">Priority Actions & Log</h2>
        <p className="text-sm text-gray-500">No recent activity.</p>
      </div>
    </div>
  )
}
