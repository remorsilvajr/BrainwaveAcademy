'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { formatCurrency, roundToCents } from '@/lib/format'

const FEE_TYPES = ['tuition', 'activity', 'other'] as const
// Cash only for now: a parent has no way to pay by check anywhere in the app, so
// offering it here would just be a dead option. `receipt-view.tsx` still labels a
// legacy 'check' row correctly, since older payments may already carry it.
const METHODS = ['cash'] as const

type ActionResult = { error: string } | undefined

function revalidateAll() {
  revalidatePath('/admin/payments')
  revalidatePath('/admin/students')
  revalidatePath('/admin')
  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
}

// These return `{ error }` instead of throwing for any expected/validation
// failure — per this Next version's own guidance (node_modules/next/dist/
// docs/01-app/01-getting-started/10-error-handling.md), a thrown Server
// Function error is treated as an uncaught exception: Next redacts its
// message in a production build down to a generic "An error occurred in
// the Server Components render" (surfaced client-side as minified React
// error #441), not the friendly text passed to `new Error(...)`. That only
// showed up once this ran against the deployed build, not `next dev`. Every
// caller here is a plain awaited function call from a Client Component
// (not a `<form action>`/`useActionState` site), so the fix is a returned
// value the caller checks, the same shape `useActionState` sites already
// use elsewhere in this app.

// Admin decides the actual amount credited — approvedAmount can differ from
// the parent's own requested_amount, per the explicit "admin controls how
// much the parent has" design. Two sequential writes (not a single RPC like
// pay_fee_with_wallet) since both sides are already fully admin-trusted —
// same "ordinary sequential admin writes" pattern the rest of this app's
// multi-step admin actions use (e.g. Approve & Create Student Record).
// The `.eq('status', 'pending')` guard on the request update means a
// concurrent double-approval only ever credits the wallet once.
export async function approveWalletRequest(
  requestId: string,
  approvedAmount: number,
  reviewNote?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
    return { error: 'Enter a valid amount greater than zero.' }
  }

  const { data: request } = await supabase
    .from('wallet_requests')
    .select('id, parent_id, status')
    .eq('id', requestId)
    .single()
  if (!request || request.status !== 'pending') {
    return { error: 'This request has already been reviewed.' }
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('parent_id', request.parent_id).single()
  if (!wallet) {
    return { error: "This parent doesn't have a wallet on file." }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { error: walletError } = await supabase
    .from('wallets')
    .update({ balance: roundToCents(wallet.balance + approvedAmount), updated_at: new Date().toISOString() })
    .eq('parent_id', request.parent_id)
  if (walletError) {
    return { error: walletError.message }
  }

  const { data: updated, error: requestError } = await supabase
    .from('wallet_requests')
    .update({
      status: 'approved',
      approved_amount: approvedAmount,
      review_note: reviewNote?.trim() || null,
      reviewed_by: actingAdmin?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (requestError) {
    return { error: requestError.message }
  }
  if (!updated) {
    return { error: 'This request has already been reviewed.' }
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Approved a wallet fund request for ${approvedAmount}`,
    targetTable: 'wallet_requests',
    targetId: requestId,
  })

  revalidateAll()
}

export async function denyWalletRequest(requestId: string, reviewNote?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('wallet_requests')
    .update({
      status: 'denied',
      review_note: reviewNote?.trim() || null,
      reviewed_by: actingAdmin?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) {
    return { error: error.message }
  }
  if (!data) {
    return { error: 'This request has already been reviewed.' }
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Denied a wallet fund request',
    targetTable: 'wallet_requests',
    targetId: requestId,
  })

  revalidateAll()
}

// Unprompted admin control over a parent's wallet, independent of any
// request — `amount` can be negative to deduct. Always re-reads the current
// balance first rather than trusting a client-supplied "current" value, so
// a deduction can never be validated against stale data.
export async function adjustWalletBalance(parentId: string, amount: number, note?: string): Promise<ActionResult> {
  const supabase = await createClient()

  if (!Number.isFinite(amount) || amount === 0) {
    return { error: 'Enter a non-zero amount.' }
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('parent_id', parentId).single()
  if (!wallet) {
    return { error: "This parent doesn't have a wallet on file." }
  }

  const newBalance = roundToCents(wallet.balance + amount)
  if (newBalance < 0) {
    return {
      error: `This parent only has ${formatCurrency(wallet.balance)} in their wallet, so you can't deduct ${formatCurrency(Math.abs(amount))}.`,
    }
  }

  const { error } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('parent_id', parentId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  // The ledger row that the Payments table shows. Best effort, like the
  // activity log below: the balance has already changed, so a failed ledger
  // write is logged server-side rather than reported as a failed adjustment.
  const { error: ledgerError } = await supabase.from('wallet_transactions').insert({
    parent_id: parentId,
    amount,
    balance_after: newBalance,
    note: note?.trim() || null,
    created_by: actingAdmin?.id ?? null,
  })
  if (ledgerError) {
    console.error(`Wallet adjustment ledger write failed: ${ledgerError.message}`)
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} ${amount > 0 ? 'to' : 'from'} a parent's wallet${note ? `: ${note.trim()}` : ''}`,
    targetTable: 'wallets',
    targetId: parentId,
  })

  revalidateAll()
}

// Cash payments, entirely separate from the wallet flow — these are
// recorded directly as already-paid, since admin is recording money that
// has already changed hands outside the app (see the Manual payment
// recording note in CLAUDE.md). `classroom_id` is best-effort (the
// student's current classroom, for reference only) and can be null for an
// unassigned student or a miscellaneous fee.
export async function recordManualPayment(
  studentId: string,
  input: { feeType: string; description: string; amount: number; method: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  if (!FEE_TYPES.includes(input.feeType as (typeof FEE_TYPES)[number])) {
    return { error: 'Invalid fee type.' }
  }
  if (!METHODS.includes(input.method as (typeof METHODS)[number])) {
    return { error: 'Only cash payments can be recorded manually.' }
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: 'Enter a valid amount greater than zero.' }
  }
  const description = input.description.trim()
  if (!description) {
    return { error: 'Enter a short description for this payment.' }
  }

  const { data: student } = await supabase.from('students').select('id, classroom_id').eq('id', studentId).single()
  if (!student) {
    return { error: 'Student not found.' }
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
    return { error: error.message }
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
// fee) as paid via cash, without touching the wallet — the
// counterpart to payFeeWithWallet for a payment made outside the app.
export async function markPaymentPaidManually(paymentId: string, method: string, notes?: string): Promise<ActionResult> {
  const supabase = await createClient()

  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return { error: 'Only cash payments can be recorded manually.' }
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
    return { error: error.message }
  }
  if (!data) {
    return { error: 'This payment could not be updated; it may have already been paid.' }
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${method} payment`,
    targetTable: 'payments',
    targetId: paymentId,
  })

  revalidateAll()
}
