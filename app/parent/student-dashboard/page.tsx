import { ClipboardList } from 'lucide-react'

const milestoneCategories = [
  'Physical Health & Motor',
  'Character & Values',
  'Language',
  'Social-Emotional',
  'Cognitive',
  'Creative',
]

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Student Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Attendance, assessments, and development milestones for your child.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
          <p className="mt-3 text-sm text-gray-500">No attendance records yet.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Latest Assessment</h2>
          <p className="mt-3 text-sm text-gray-500">No assessments on file yet.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Development Milestone Tracker</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {milestoneCategories.map((category) => (
            <div key={category} className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-900">{category}</p>
              <p className="mt-1 text-xs text-gray-400">Not yet assessed</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Daily Attendance</h2>
        </div>
        <p className="mt-3 text-sm text-gray-500">No records yet.</p>
      </div>
    </div>
  )
}
