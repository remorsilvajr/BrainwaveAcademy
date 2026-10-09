import { createClient } from '@/lib/supabase/server'
import { isTerminalStudentStatus } from '@/lib/student-status'
import { PaymentsTabs } from '@/components/admin/payments-tabs'

// Shared by /admin/payments and /cashier/payments. The cashier sees the same tabs but not
// the admin-only corrections (waive, void, edit, reverse).
export async function PaymentsPageContent({ mode }: { mode: 'admin' | 'cashier' }) {
  const supabase = await createClient()

  const [{ data: payments }, { data: students }, { data: adjustments }, { data: paymentTransactions }, { data: classrooms }] = await Promise.all([
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id, classroom_id, enrollment_status')
      .order('first_name', { ascending: true }),
    supabase.from('payment_adjustments').select('id, payment_id, action, reason, created_at').order('created_at', { ascending: false }),
    // Money received, one row per payment (a fee can be paid in installments).
    // A reversed payment is kept as history but no longer counts.
    supabase
      .from('payment_transactions')
      .select('id, payment_id, amount, payment_method, transaction_date, receipt_ref')
      .is('reversed_at', null)
      .order('transaction_date', { ascending: false }),
    supabase.from('classrooms').select('id, name').order('min_age_months', { ascending: true, nullsFirst: false }).order('slug'),
  ])

  // Only a super admin can delete fees; decided here so nothing about the tier reaches a regular admin's browser.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = mode === 'admin' ? await supabase.from('profiles').select('is_super_admin').eq('id', user?.id ?? '').maybeSingle() : { data: null }
  const canDeleteFees = !!me?.is_super_admin

  const studentById = new Map((students ?? []).map((s) => [s.id, s]))

  const rows = (payments ?? []).map((p) => {
    const student = studentById.get(p.student_id)
    return {
      ...p,
      studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
      studentAccountId: student?.student_id ?? null,
    }
  })

  const studentOptions = (students ?? []).map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name}`,
    sublabel: s.student_id ?? undefined,
  }))

  // Student Balances lists every student still at the school, plus any withdrawn
  // or graduated child who still has fees on record.
  const classNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const studentsWithFees = new Set((payments ?? []).map((p) => p.student_id))
  const balanceStudents = (students ?? [])
    .filter((s) => !isTerminalStudentStatus(s.enrollment_status) || studentsWithFees.has(s.id))
    .map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      accountId: s.student_id ?? null,
      classId: s.classroom_id ?? null,
      className: s.classroom_id ? (classNameById.get(s.classroom_id) ?? null) : null,
    }))

  // Every fee's own history (waived, voided, edited, reversed), newest first.
  const adjustmentsByPayment: Record<string, { id: string; action: 'waived' | 'voided' | 'edited' | 'reversed'; reason: string; created_at: string }[]> = {}
  for (const a of adjustments ?? []) {
    ;(adjustmentsByPayment[a.payment_id] ??= []).push({ id: a.id, action: a.action, reason: a.reason, created_at: a.created_at })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Record cash payments and review every fee and payment. Parents pay online by card or GCash.
        </p>
      </div>
      <PaymentsTabs
        payments={rows}
        received={paymentTransactions ?? []}
        adjustmentsByPayment={adjustmentsByPayment}
        studentOptions={studentOptions}
        balanceStudents={balanceStudents}
        classrooms={classrooms ?? []}
        mode={mode}
        {...(canDeleteFees ? { canDeleteFees: true } : {})}
      />
    </div>
  )
}
