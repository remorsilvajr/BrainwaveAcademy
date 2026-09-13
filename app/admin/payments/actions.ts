'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const FEE_TYPES = ['tuition', 'activity', 'other'] as const
const METHODS = ['cash', 'check'] as const

function revalidateAll() {
  revalidatePath('/admin/payments')
  revalidatePath('/admin/students')
  revalidatePath('/admin')
  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
}

// Cash/check payments, entirely separate from the wallet flow — these are
// recorded directly as already-paid, since admin is recording money that
// has already changed hands outside the app (see the Manual payment
// recording note in CLAUDE.md). `classroom_id` is best-effort (the
// student's current classroom, for reference only) and can be null for an
// unassigned student or a miscellaneous fee.
export async function recordManualPayment(
  studentId: string,
  input: { feeType: string; description: string; amount: number; method: string }
) {
  const supabase = await createClient()

  if (!FEE_TYPES.includes(input.feeType as (typeof FEE_TYPES)[number])) {
    throw new Error('Invalid fee type.')
  }
  if (!METHODS.includes(input.method as (typeof METHODS)[number])) {
    throw new Error('Payment method must be cash or check.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a valid amount greater than zero.')
  }
  const description = input.description.trim()
  if (!description) {
    throw new Error('Enter a short description for this payment.')
  }

  const { data: student } = await supabase.from('students').select('id, classroom_id').eq('id', studentId).single()
  if (!student) {
    throw new Error('Student not found.')
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('payments').insert({
    student_id: studentId,
    classroom_id: student.classroom_id,
    fee_type: input.feeType,
    description,
    amount: input.amount,
    status: 'paid',
    payment_method: input.method,
    transaction_date: new Date().toISOString(),
    recorded_by: actingAdmin?.id ?? null,
  })
  if (error) {
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${input.method} payment of ${input.amount} for a student`,
    targetTable: 'payments',
    targetId: studentId,
  })

  revalidateAll()
}

// Marks an already-generated pending fee item (e.g. a classroom's tuition
// fee) as paid via cash/check, without touching the wallet — the
// counterpart to payFeeWithWallet for a payment made outside the app.
export async function markPaymentPaidManually(paymentId: string, method: string, notes?: string) {
  const supabase = await createClient()

  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    throw new Error('Payment method must be cash or check.')
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      payment_method: method,
      transaction_date: new Date().toISOString(),
      recorded_by: actingAdmin?.id ?? null,
      ...(notes ? { description: notes } : {}),
    })
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('This payment could not be updated — it may have already been paid.')
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${method} payment`,
    targetTable: 'payments',
    targetId: paymentId,
  })

  revalidateAll()
}
