import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReceiptView } from '@/components/payments/receipt-view'

export default async function CashierReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const supabase = await createClient()

  const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!payment || payment.amount_paid <= 0) {
    notFound()
  }

  // A fee can now be paid in installments; the receipt shows the most
  // recent one. Falls back to the fee's own flat fields defensively (should
  // not happen once every paid fee has a backfilled transaction row).
  const { data: latestTransaction } = await supabase
    .from('payment_transactions')
    .select('receipt_ref, transaction_date, payment_method, amount')
    .eq('payment_id', paymentId)
    .order('transaction_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const [{ data: student }, { data: classroom }] = await Promise.all([
    supabase.from('students').select('first_name, last_name, student_id, classroom_id').eq('id', payment.student_id).maybeSingle(),
    payment.classroom_id
      ? supabase.from('classrooms').select('name').eq('id', payment.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const { data: parentLink } = await supabase
    .from('parent_student')
    .select('profiles(first_name, last_name)')
    .eq('student_id', payment.student_id)
    .maybeSingle()

  const parentProfile = (parentLink as unknown as { profiles: { first_name: string; last_name: string } | null } | null)?.profiles

  return (
    <ReceiptView
      backHref="/cashier/payments"
      data={{
        receiptRef: latestTransaction?.receipt_ref ?? payment.receipt_ref,
        transactionDate: latestTransaction?.transaction_date ?? payment.transaction_date,
        paymentMethod: latestTransaction?.payment_method ?? payment.payment_method,
        description: payment.description,
        amount: latestTransaction?.amount ?? payment.amount,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
        studentAccountId: student?.student_id ?? null,
        parentName: parentProfile ? `${parentProfile.first_name} ${parentProfile.last_name}` : null,
        classroomName: classroom?.name ?? null,
      }}
    />
  )
}
