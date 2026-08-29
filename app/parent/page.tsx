// TODO: replace placeholders with real Supabase queries once auth context is wired in.
// - Welcome name comes from profiles.last_name (+ Mr./Mrs. — you'll need to store or infer title)
// - Enrollment progress comes from applications.status for this parent's application(s)
// - Due balance comes from payments where status = 'pending' or 'overdue'
// - Announcements come from the announcements table (target_role = 'all' or 'parent')

export default function ParentDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome back, Mrs. Dela Cruz</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Enrollment Progress</p>
          <p className="text-lg font-medium mt-1">Pending Document Review</p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Due Balance</p>
          <p className="text-lg font-medium mt-1">₱0.00</p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">School Updates</p>
          <p className="text-lg font-medium mt-1">No new updates</p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">Recent Announcements</h2>
        <p className="text-sm text-gray-500">No announcements yet.</p>
      </div>
    </div>
  )
}
