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
  // requests that haven't been approved yet (Enroll A Student's queue) and
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
        <h1 className="text-2xl font-bold text-[#0b1b62]">Administrator Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time summary of school operations, pending approvals, recent payments, and
          feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-amber-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Applications</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{pendingApplicationsCount}</p>
          <p className="mt-1 text-xs text-gray-400">Awaiting review &amp; document validation</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-green-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Student Enrollment</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{activeEnrollmentCount}</p>
          <p className="mt-1 text-xs text-gray-400">Currently active students</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unresolved Feedback</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{feedbackItems.length}</p>
          <p className="mt-1 text-xs text-gray-400">Parent inquiries needing response</p>
        </div>
        {/* Payments aren't wired up yet — left as static placeholder. */}
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-sky-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Collections Today</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">₱48,500.00</p>
          <p className="mt-1 text-xs text-gray-400">6 transactions completed today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payments aren't wired up yet — left as static placeholder. */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#0b1b62]">Recent Financial Transactions</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400">
              <tr>
                <th className="pb-2 font-medium">Ref # / Date</th>
                <th className="pb-2 font-medium">Payer / Student</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 align-top">
                  TXN-9021
                  <br />
                  <span className="text-xs text-gray-400">Today, 10:42 AM</span>
                </td>
                <td className="py-2 align-top">
                  Maria Santos
                  <br />
                  <span className="text-xs text-gray-400">Leo Santos (Nursery)</span>
                </td>
                <td className="py-2 align-top">GCash</td>
                <td className="py-2 align-top">₱12,500.00</td>
                <td className="py-2 align-top">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    Verified
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 align-top">
                  TXN-9020
                  <br />
                  <span className="text-xs text-gray-400">Today, 09:15 AM</span>
                </td>
                <td className="py-2 align-top">
                  Juan Dela Cruz
                  <br />
                  <span className="text-xs text-gray-400">Anna Dela Cruz (Pre-K)</span>
                </td>
                <td className="py-2 align-top">BDO Transfer</td>
                <td className="py-2 align-top">₱8,000.00</td>
                <td className="py-2 align-top">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    Verified
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PriorityFeedbackLog items={feedbackItems} />
      </div>
    </div>
  )
}
