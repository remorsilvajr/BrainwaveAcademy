import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort, isToday, nowMs } from '@/lib/format'
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

  const [
    { data: applications },
    { data: students },
    { data: feedbackRows },
    { count: unresolvedFeedbackCount },
    { data: recentPayments },
    { data: pendingWalletRequests },
  ] = await Promise.all([
    supabase.from('applications').select('status, created_student_id'),
    supabase.from('students').select('enrollment_status'),
    supabase
      .from('feedback')
      .select('id, subject, message, created_at, profiles!submitted_by(first_name, last_name)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<FeedbackRow[]>(),
    // Separate exact-count query — the list above is capped at 5 for the
    // dashboard widget, so feedbackRows.length would silently undercount
    // this stat once there are more than 5 unresolved reports.
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('resolved', false),
    supabase
      .from('payments')
      .select('id, student_id, amount, payment_method, transaction_date, receipt_ref')
      .eq('status', 'paid')
      .order('transaction_date', { ascending: false })
      .limit(8),
    // Uncapped by design, same reasoning as the feedback/collections stats
    // above — this feeds both a count and a sum, so it can't be derived from
    // a display-capped list.
    supabase.from('wallet_requests').select('requested_amount').eq('status', 'pending'),
  ])

  // Uncapped, separate from the 8-row display list above for the same
  // reason the Unresolved Feedback stat needed its own exact-count query —
  // deriving "today's total" from a capped list would silently undercount
  // once more than 8 payments land in a single day.
  const { data: paidTodayAmounts } = await supabase
    .from('payments')
    .select('amount, transaction_date')
    .eq('status', 'paid')
    .gte('transaction_date', new Date(nowMs() - 24 * 60 * 60 * 1000).toISOString())

  // Two separate stages of the pipeline, shown as two separate cards (they
  // used to be combined into one "Pending Applications" stat linking to
  // Enrollment Requests — found live as a real bug: the combined count
  // included Applications' queue too, so clicking through to Enrollment
  // Requests could show 0 even when the dashboard said 16, since all of
  // them were actually sitting in Applications instead. See CLAUDE.md's
  // note on why these are two separate, easily-confused features.
  const pendingReviewCount = (applications ?? []).filter((a) => a.status === 'pending_review').length
  const pendingDocumentsCount = (applications ?? []).filter(
    (a) => a.status === 'approved' && !a.created_student_id
  ).length

  const activeEnrollmentCount = (students ?? []).filter((s) => s.enrollment_status === 'active').length

  const paymentStudentIds = (recentPayments ?? []).map((p) => p.student_id)
  const { data: paymentStudents } =
    paymentStudentIds.length > 0
      ? await supabase.from('students').select('id, first_name, last_name').in('id', paymentStudentIds)
      : { data: [] }
  const paymentStudentById = new Map((paymentStudents ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]))

  const totalCollectedToday = (paidTodayAmounts ?? [])
    .filter((p) => p.transaction_date && isToday(p.transaction_date))
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingWalletRequestCount = pendingWalletRequests?.length ?? 0
  const pendingWalletRequestTotal = (pendingWalletRequests ?? []).reduce((sum, r) => sum + r.requested_amount, 0)

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/enroll-a-student"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400 dark:border-l-amber-600 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-amber-300 dark:hover:border-amber-500"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Enrollment Requests</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{pendingReviewCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">New enrollment requests awaiting review</p>
        </Link>
        <Link
          href="/admin/applications"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-orange-400 dark:border-l-orange-600 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-orange-300 dark:hover:border-orange-500"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Applications</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{pendingDocumentsCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Approved requests awaiting document review</p>
        </Link>
        <Link
          href="/admin/students"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-400 dark:border-l-green-600 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-green-300 dark:hover:border-green-500"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Student Enrollment</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{activeEnrollmentCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Currently active students</p>
        </Link>
        <Link
          href="/admin/feedback"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-400 dark:border-l-red-600 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-red-300 dark:hover:border-red-500"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Unresolved Feedback</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{unresolvedFeedbackCount ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Bug reports &amp; feedback needing response</p>
        </Link>
        <Link
          href="/admin/payments"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-sky-400 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-sky-300 dark:hover:border-sky-500"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Collections Today</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalCollectedToday)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {totalCollectedToday > 0 ? 'Paid today, wallet + cash/check' : 'No transactions yet'}
          </p>
        </Link>
        <Link
          href="/admin/payments?tab=requests"
          className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-purple-400 dark:border-l-purple-600 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:border-purple-300 dark:hover:border-purple-500"
        >
          <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Wallet className="h-4 w-4" />
            Pending Fund Requests
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{pendingWalletRequestCount}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {pendingWalletRequestCount > 0
              ? `${formatCurrency(pendingWalletRequestTotal)} requested, review in Payments →`
              : 'No wallet top-up requests waiting'}
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(recentPayments ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-gray-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                (recentPayments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      {p.receipt_ref ?? '-'}
                      <br />
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {p.transaction_date ? formatDateShort(p.transaction_date) : '-'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      {paymentStudentById.get(p.student_id) ?? 'Unknown student'}
                    </td>
                    <td className="py-2 capitalize text-gray-700 dark:text-gray-300">{p.payment_method ?? '-'}</td>
                    <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <PriorityFeedbackLog items={feedbackItems} viewAllHref="/admin/feedback" />
      </div>
    </div>
  )
}
