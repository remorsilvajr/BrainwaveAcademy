import { createClient } from '@/lib/supabase/server'
import { PriorityFeedbackLog } from '@/components/admin/priority-feedback-log'

type FeedbackRow = {
  id: string
  subject: string
  message: string
  created_at: string
  profiles: { first_name: string; last_name: string } | null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ data: applications }, { data: students }, { data: feedbackRows }] = await Promise.all([
    supabase.from('applications').select('status, created_student_id'),
    supabase.from('students').select('enrollment_status'),
    supabase
      .from('feedback')
      .select('id, subject, message, created_at, profiles(first_name, last_name)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<FeedbackRow[]>(),
  ])

  // "Pending Applications" spans both stages of the pipeline: enrollment
  // requests that haven't been approved yet (Enrollment Requests' queue) and
  // approved requests whose documents aren't fully verified yet, i.e. no
  // student record created (Applications' queue) — see CLAUDE.md's note on
  // why these are two separate, easily-confused features.
  const pendingReviewCount = (applications ?? []).filter((a) => a.status === 'pending_review').length
  const pendingDocumentsCount = (applications ?? []).filter(
    (a) => a.status === 'approved' && !a.created_student_id
  ).length
  const pendingApplicationsCount = pendingReviewCount + pendingDocumentsCount

  const activeEnrollmentCount = (students ?? []).filter((s) => s.enrollment_status === 'active').length

  const feedbackItems = (feedbackRows ?? []).map((f) => ({
    id: f.id,
    subject: f.subject,
    message: f.message,
    created_at: f.created_at,
    submitter_name: f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name}` : 'Unknown',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Administrator Overview</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real-time summary of school operations, pending approvals, recent payments, and
          feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400 dark:border-l-amber-600 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Applications</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{pendingApplicationsCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Awaiting review &amp; document validation</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-400 dark:border-l-green-600 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Student Enrollment</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{activeEnrollmentCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Currently active students</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-400 dark:border-l-red-600 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unresolved Feedback</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{feedbackItems.length}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Parent inquiries needing response</p>
        </div>
        {/* No `payments` table/UI exists yet — shown as an honest empty
            state rather than fabricated numbers. See the matching note on
            the Recent Financial Transactions card below. */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-sky-400 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Collections Today</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">₱0.00</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">No transactions yet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payments aren't wired up yet — no `payments` table exists, so
            this stays an empty shell (matching every other list's own
            empty state) rather than fabricated rows. */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#0b1b62] dark:text-indigo-300">Recent Financial Transactions</h2>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-gray-400 dark:text-gray-500">
              <tr>
                <th className="pb-2 font-medium">Ref # / Date</th>
                <th className="pb-2 font-medium">Payer / Student</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                  No transactions recorded yet.
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <PriorityFeedbackLog items={feedbackItems} />
      </div>
    </div>
  )
}
