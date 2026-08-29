export default function TeacherDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Attendance</p>
          <p className="text-lg font-medium mt-1">Not taken today</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Milestones</p>
          <p className="text-lg font-medium mt-1">0 pending</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Announcements</p>
          <p className="text-lg font-medium mt-1">No new announcements</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Pending Student Assessments</p>
          <p className="text-lg font-medium mt-1">0 pending</p>
        </div>
      </div>
    </div>
  )
}
