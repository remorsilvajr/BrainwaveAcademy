'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { formatCurrency, roundToCents } from '@/lib/format'

const FEE_TYPES = ['tuition', 'activity', 'other'] as const
const METHODS = ['cash', 'check'] as const

function revalidateAll() {
  revalidatePath('/admin/payments')
  revalidatePath('/admin/students')
  revalidatePath('/admin')
  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
}

// Admin decides the actual amount credited — approvedAmount can differ from
// the parent's own requested_amount, per the explicit "admin controls how
// much the parent has" design. Two sequential writes (not a single RPC like
// pay_fee_with_wallet) since both sides are already fully admin-trusted —
// same "ordinary sequential admin writes" pattern the rest of this app's
// multi-step admin actions use (e.g. Approve & Create Student Record).
// The `.eq('status', 'pending')` guard on the request update means a
// concurrent double-approval only ever credits the wallet once.
export async function approveWalletRequest(requestId: string, approvedAmount: number, reviewNote?: string) {
  const supabase = await createClient()

  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
    throw new Error('Enter a valid amount greater than zero.')
  }

  const { data: request } = await supabase
    .from('wallet_requests')
    .select('id, parent_id, status')
    .eq('id', requestId)
    .single()
  if (!request || request.status !== 'pending') {
    throw new Error('This request has already been reviewed.')
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('parent_id', request.parent_id).single()
  if (!wallet) {
    throw new Error("This parent doesn't have a wallet on file.")
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { error: walletError } = await supabase
    .from('wallets')
    .update({ balance: roundToCents(wallet.balance + approvedAmount), updated_at: new Date().toISOString() })
    .eq('parent_id', request.parent_id)
  if (walletError) {
    throw new Error(walletError.message)
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
    throw new Error(requestError.message)
  }
  if (!updated) {
    throw new Error('This request has already been reviewed.')
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Approved a wallet fund request for ${approvedAmount}`,
    targetTable: 'wallet_requests',
    targetId: requestId,
  })

  revalidateAll()
}

export async function denyWalletRequest(requestId: string, reviewNote?: string) {
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
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('This request has already been reviewed.')
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
export async function adjustWalletBalance(parentId: string, amount: number, note?: string) {
  const supabase = await createClient()

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Enter a non-zero amount.')
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('parent_id', parentId).single()
  if (!wallet) {
    throw new Error("This parent doesn't have a wallet on file.")
  }

  const newBalance = roundToCents(wallet.balance + amount)
  if (newBalance < 0) {
    throw new Error(`This would take the wallet below zero (current balance: ${formatCurrency(wallet.balance)}).`)
  }

  const { error } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('parent_id', parentId)
  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} ${amount > 0 ? 'to' : 'from'} a parent's wallet${note ? `: ${note.trim()}` : ''}`,
    targetTable: 'wallets',
    targetId: parentId,
  })

  revalidateAll()
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
    throw new Error('This payment could not be updated; it may have already been paid.')
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${method} payment`,
    targetTable: 'payments',
    targetId: paymentId,
  })

  revalidateAll()
}
