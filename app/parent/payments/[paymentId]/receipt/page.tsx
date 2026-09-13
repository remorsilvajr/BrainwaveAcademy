import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReceiptView } from '@/components/payments/receipt-view'

// No explicit ownership check here — parents_view_child_payments RLS
// already scopes this select to the caller's own linked children, so a
// payment id belonging to someone else's child simply comes back null,
// same "trust RLS" pattern as the rest of this app's parent-facing pages.
export default async function ParentReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const supabase = await createClient()

  const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!payment || payment.status !== 'paid') {
    notFound()
  }

  const [{ data: student }, { data: classroom }, { data: parentProfile }] = await Promise.all([
    supabase.from('students').select('first_name, last_name, student_id').eq('id', payment.student_id).maybeSingle(),
    payment.classroom_id
      ? supabase.from('classrooms').select('name').eq('id', payment.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.auth.getUser().then(async ({ data: { user } }) =>
      supabase.from('profiles').select('first_name, last_name').eq('id', user?.id ?? '').maybeSingle()
    ),
  ])

  return (
    <ReceiptView
      backHref="/parent/payments"
      data={{
        receiptRef: payment.receipt_ref,
        transactionDate: payment.transaction_date,
        paymentMethod: payment.payment_method,
        description: payment.description,
        amount: payment.amount,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
        studentAccountId: student?.student_id ?? null,
        parentName: parentProfile ? `${parentProfile.first_name} ${parentProfile.last_name}` : null,
        classroomName: classroom?.name ?? null,
      }}
    />
  )
}
