'use server'

import { revalidatePath } from 'next/cache'
import { formatCurrency, roundToCents } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { emailReceiptFor } from '@/lib/send-receipt'
import { simulateCardPayment, simulateGcashPayment, type OnlineMethod } from '@/lib/sandbox-checkout'
import { completeIfReadyAfterBalanceChange } from '@/lib/completion'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: 'Enter a valid amount greater than zero.',
  INVALID_METHOD: 'Choose card or GCash.',
  NOT_AUTHORIZED: 'These fees do not belong to one of your children.',
  AMOUNT_EXCEEDS_OUTSTANDING: "That's more than this child's total outstanding balance.",
}

export type OnlineCheckoutDetails =
  | { method: 'card'; number: string; expiry: string; cvc: string; name: string }
  | { method: 'gcash'; mobile: string }

export type OnlinePaymentResult =
  | { error: string }
  | { ok: true; amount: number; methodNote: string; receipts: { paymentId: string; transactionId: string }[] }

// Pays any amount toward a child's unpaid fees online (a SANDBOX for now, see
// lib/sandbox-checkout.ts: no real money moves). The checkout is decided here
// on the server; only after it accepts does the service role call
// pay_amount_online, which parents can't call themselves (EXECUTE revoked).
// The parent's identity and their link to the child come from the session and
// are re-checked inside the function, never taken from the browser. Card
// numbers are never stored or logged, only "Visa ending 1111".
export async function payOnline(studentId: string, rawAmount: number, details: OnlineCheckoutDetails): Promise<OnlinePaymentResult> {
  const amount = roundToCents(Number(rawAmount))
  if (typeof studentId !== 'string' || !Number.isFinite(amount) || amount <= 0) {
    return { error: ERROR_MESSAGES.INVALID_AMOUNT }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in and try again.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') return { error: 'Only a parent can pay fees online.' }

  // Cheap checks before "charging": the child is theirs and the amount isn't more than is owed.
  const { data: link } = await supabase.from('parent_student').select('student_id').eq('parent_id', user.id).eq('student_id', studentId).maybeSingle()
  if (!link) return { error: ERROR_MESSAGES.NOT_AUTHORIZED }
  const { data: pending } = await supabase.from('payments').select('amount, amount_paid').eq('student_id', studentId).eq('status', 'pending')
  const owed = roundToCents((pending ?? []).reduce((sum, p) => sum + (Number(p.amount) - Number(p.amount_paid)), 0))
  if (amount > owed) return { error: `That's more than the ${formatCurrency(owed)} still owed for this child.` }

  const method: OnlineMethod | null = details?.method === 'card' || details?.method === 'gcash' ? details.method : null
  if (!method) return { error: ERROR_MESSAGES.INVALID_METHOD }
  const checkout =
    details.method === 'card'
      ? simulateCardPayment({ number: String(details.number ?? ''), expiry: String(details.expiry ?? ''), cvc: String(details.cvc ?? ''), name: String(details.name ?? '') })
      : simulateGcashPayment({ mobile: String(details.mobile ?? '') })
  if (!checkout.ok) return { error: checkout.error }

  const { data: transactionIds, error } = await createAdminClient().rpc('pay_amount_online', {
    p_parent_id: user.id,
    p_student_id: studentId,
    p_amount: amount,
    p_method: method,
    p_note: checkout.note,
  })
  if (error) {
    const code = Object.keys(ERROR_MESSAGES).find((c) => error.message.includes(c))
    return { error: code ? ERROR_MESSAGES[code] : 'Something went wrong processing this payment. You were not charged.' }
  }

  const ids: string[] = transactionIds ?? []
  const { data: rows } = ids.length > 0 ? await supabase.from('payment_transactions').select('id, payment_id').in('id', ids) : { data: [] }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Paid ${formatCurrency(amount)} online (${checkout.note}) toward outstanding fees`,
    targetTable: 'payments',
    targetId: studentId,
  })

  // A receipt by email for each fee this payment touched (to the parent who
  // paid, unless they turned emails off).
  for (const id of ids) {
    await emailReceiptFor(id)
  }

  await completeIfReadyAfterBalanceChange(studentId)
  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
  return {
    ok: true,
    amount,
    methodNote: checkout.note,
    receipts: (rows ?? []).map((r) => ({ paymentId: r.payment_id, transactionId: r.id })),
  }
}
