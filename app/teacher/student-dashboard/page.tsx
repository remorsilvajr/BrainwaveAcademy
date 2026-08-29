const milestoneCategories = [
  'Physical Health & Motor',
  'Character & Values',
  'Language',
  'Social-Emotional',
  'Cognitive',
  'Creative',
]

export default function TeacherStudentDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Attendance</p>
          <p className="text-lg font-medium mt-1">No data yet</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Latest Assessment</p>
          <p className="text-lg font-medium mt-1">No data yet</p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">Development Milestone Tracker</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {milestoneCategories.map((category) => (
            <div key={category} className="border rounded p-3 text-sm">
              <p className="font-medium">{category}</p>
              <p className="text-gray-500 mt-1">Not yet assessed</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-3">Recent Daily Attendance</h2>
        <p className="text-sm text-gray-500">No records yet.</p>
      </div>
    </div>
  )
}
