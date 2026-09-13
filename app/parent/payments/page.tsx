import { ClipboardList, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parentApplicationsFilter } from '@/lib/parent-applications'
import { EmptyState } from '@/components/ui/empty-state'
import { FeeBreakdown } from '@/components/parent/fee-breakdown'
import { WalletPanel } from '@/components/parent/wallet-panel'

export default async function ParentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Same created_parent_id/parent_email + hidden_from_parent filtering as
  // every other parent page — see app/parent/layout.tsx.
  const [{ data: applications }, { data: wallet }, { data: walletRequests }] = await Promise.all([
    supabase
      .from('applications')
      .select('id, student_first_name, student_last_name, created_student_id')
      .eq('hidden_from_parent', false)
      .or(parentApplicationsFilter(user))
      .order('submitted_at', { ascending: true }),
    supabase.from('wallets').select('balance').eq('parent_id', user?.id ?? '').maybeSingle(),
    supabase
      .from('wallet_requests')
      .select('*')
      .eq('parent_id', user?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const walletBalance = wallet?.balance ?? 0

  const application = (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  // The wallet itself belongs to the parent, not any one child, so it (and
  // requesting more funds) is shown regardless of whether a child has
  // gotten as far as being enrolled/classroom-assigned yet — only the
  // per-child fee breakdown below needs that.
  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
        </div>
        <WalletPanel balance={walletBalance} requests={walletRequests ?? []} />
        <EmptyState
          icon={ClipboardList}
          title="No Enrollment Application Yet"
          description="Once your child is enrolled and assigned to a classroom, their fee breakdown and payment history will appear here."
          action={{ href: '/parent/enroll-a-student', label: 'Enroll A Student' }}
        />
      </div>
    )
  }

  const studentName = `${application.student_first_name} ${application.student_last_name}`

  if (!application.created_student_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
        </div>
        <WalletPanel balance={walletBalance} requests={walletRequests ?? []} />
        <EmptyState
          icon={GraduationCap}
          title="Not Enrolled Yet"
          tone="warning"
          description={`${studentName} hasn't been enrolled and assigned to a classroom yet, so there are no fees to show. Check Enrollment Status for the latest update.`}
          action={{ href: '/parent/enrollment-status', label: 'View Enrollment Status' }}
        />
      </div>
    )
  }

  const [{ data: student }, { data: payments }] = await Promise.all([
    supabase.from('students').select('classroom_id').eq('id', application.created_student_id).maybeSingle(),
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', application.created_student_id)
      .order('due_date', { ascending: true }),
  ])

  const { data: classroom } = student?.classroom_id
    ? await supabase.from('classrooms').select('name').eq('id', student.classroom_id).maybeSingle()
    : { data: null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
      </div>
      <WalletPanel balance={walletBalance} requests={walletRequests ?? []} />
      <FeeBreakdown
        studentName={studentName}
        classroomName={classroom?.name ?? null}
        walletBalance={walletBalance}
        payments={payments ?? []}
      />
    </div>
  )
}
