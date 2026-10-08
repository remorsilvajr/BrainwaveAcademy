import { ClipboardList, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parentApplicationsFilter } from '@/lib/parent-applications'
import { EmptyState } from '@/components/ui/empty-state'
import { FeeBreakdown } from '@/components/parent/fee-breakdown'
import { withStudent } from '@/lib/parent-links'

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
  // Fees are paid online (a sandbox for now, see lib/sandbox-checkout.ts); the
  // old wallet is no longer shown anywhere. Its tables are kept, untouched.
  const { data: applications } = await supabase
    .from('applications')
    .select('id, student_first_name, student_last_name, created_student_id')
    .eq('hidden_from_parent', false)
    .or(parentApplicationsFilter(user))
    .order('submitted_at', { ascending: true })

  const application = (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
        </div>
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
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments for {studentName}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
        </div>
        <EmptyState
          icon={GraduationCap}
          title="Not Enrolled Yet"
          tone="warning"
          description={`${studentName} hasn't been enrolled and assigned to a classroom yet, so there are no fees to show. Check Enrollment Status for the latest update.`}
          action={{ href: withStudent('/parent/enrollment-status', studentParam), label: 'View Enrollment Status' }}
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
      // Waived and voided fees are neither owed nor paid, so they aren't sent to the page at all.
      .not('status', 'in', '(waived,voided)')
      .order('due_date', { ascending: true }),
  ])

  const { data: classroom } = student?.classroom_id
    ? await supabase.from('classrooms').select('name').eq('id', student.classroom_id).maybeSingle()
    : { data: null }

  // Payment History lists individual payment events, not fees, since a fee
  // can now be paid in installments — one row per payment_transactions entry.
  const paymentIds = (payments ?? []).map((p) => p.id)
  const { data: transactionRows } =
    paymentIds.length > 0
      ? await supabase
          .from('payment_transactions')
          .select('id, payment_id, amount, payment_method, transaction_date')
          .in('payment_id', paymentIds)
          .is('reversed_at', null)
          .order('transaction_date', { ascending: false })
      : { data: [] }

  const feeById = new Map((payments ?? []).map((p) => [p.id, p]))
  const transactions = (transactionRows ?? []).map((t) => {
    const fee = feeById.get(t.payment_id)
    return { ...t, feeDescription: fee?.description ?? null, feeType: fee?.fee_type ?? 'other' }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments for {studentName}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and pay outstanding fees.</p>
      </div>
      <FeeBreakdown
        studentId={application.created_student_id}
        studentName={studentName}
        classroomName={classroom?.name ?? null}
        payments={payments ?? []}
        transactions={transactions}
      />
    </div>
  )
}
