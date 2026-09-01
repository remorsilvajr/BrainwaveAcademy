import { createClient } from '@/lib/supabase/server'
import { EnrollmentRequestsTable } from '@/components/admin/enrollment-requests-table'
import { isToday } from '@/lib/format'

export default async function EnrollAStudentPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('*')
    .order('submitted_at', { ascending: false })

  const applications = data ?? []
  const pendingCount = applications.filter((a) => a.status === 'pending_review').length
  const approvedTodayCount = applications.filter(
    (a) => a.status === 'approved' && a.reviewed_at && isToday(a.reviewed_at)
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Landing Page Enrollment Requests</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review light enrollment submissions from the public website, approve enrollment
          requests, and automatically trigger account setup emails. This creates the parent
          account only — the child becomes an enrolled student after document review in
          Applications.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 dark:bg-pink-950/30 px-4 py-2 text-sm font-medium text-pink-700">
          New Requests: {pendingCount}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-2 text-sm font-medium text-green-700">
          Approved Today: {approvedTodayCount}
        </span>
      </div>

      <EnrollmentRequestsTable applications={applications} />
    </div>
  )
}
