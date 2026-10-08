'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { emailReceiptFor } from '@/lib/send-receipt'
import { formatCurrency, formatDateShort, roundToCents } from '@/lib/format'
import { requireAdmin, requirePaymentsStaff } from '@/lib/require-admin'
import { notifyParentsOfStudent, notifyUsers } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { walletDecisionEmail } from '@/lib/notification-emails'
import { getSiteUrl } from '@/lib/site-url'
import { validateFeeAmount, validateFeeDueDate, validateFeeReason } from '@/lib/fees'

const FEE_TYPES = ['tuition', 'activity', 'other'] as const
// Cash only for now: a parent has no way to pay by check anywhere in the app, so
// offering it here would just be a dead option. `receipt-view.tsx` still labels a
// legacy 'check' row correctly, since older payments may already carry it.
const METHODS = ['cash'] as const

type ActionResult = { error: string } | undefined

// A wallet request decision always reaches the parent: an email (best effort,
// logged if it fails) and a bell notification. Both happen only after the
// decision itself succeeded, so neither can fail it.
async function tellParentAboutWalletRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  decision: { approved: boolean; requestedAmount: number; approvedAmount: number | null; note: string | null }
) {
  await notifyUsers([parentId], {
    kind: 'money',
    title: decision.approved ? 'Wallet top-up approved' : 'Wallet top-up not approved',
    body: decision.approved
      ? `${formatCurrency(decision.approvedAmount ?? decision.requestedAmount)} was added to your wallet.`
      : `Your request for ${formatCurrency(decision.requestedAmount)} was not approved.${decision.note ? ` ${decision.note}` : ''}`,
    href: '/parent/payments',
  })
  try {
    const { data: parent } = await supabase.from('profiles').select('email, first_name').eq('id', parentId).maybeSingle()
    if (!parent?.email) return
    const mail = walletDecisionEmail({
      parentFirstName: parent.first_name,
      approved: decision.approved,
      requestedAmount: decision.requestedAmount,
      approvedAmount: decision.approvedAmount,
      note: decision.note,
      siteUrl: getSiteUrl(),
    })
    await sendEmail({ to: parent.email, subject: mail.subject, html: mail.html })
  } catch (err) {
    console.error('sendEmail failed for the wallet request decision:', err)
  }
}

function revalidateAll() {
  revalidatePath('/admin/payments')
  revalidatePath('/cashier/payments')
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
  await requirePaymentsStaff()

  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
    return { error: 'Enter a valid amount greater than zero.' }
  }

  const { data: request } = await supabase
    .from('wallet_requests')
    .select('id, parent_id, status, requested_amount')
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

  await tellParentAboutWalletRequest(supabase, request.parent_id, {
    approved: true,
    requestedAmount: request.requested_amount,
    approvedAmount,
    note: reviewNote?.trim() || null,
  })

  revalidateAll()
}

export async function denyWalletRequest(requestId: string, reviewNote?: string): Promise<ActionResult> {
  const supabase = await createClient()
  await requirePaymentsStaff()
  const { data: original } = await supabase
    .from('wallet_requests')
    .select('parent_id, requested_amount')
    .eq('id', requestId)
    .maybeSingle()
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

  if (original) {
    await tellParentAboutWalletRequest(supabase, original.parent_id, {
      approved: false,
      requestedAmount: original.requested_amount,
      approvedAmount: null,
      note: reviewNote?.trim() || null,
    })
  }

  revalidateAll()
}

// Unprompted admin control over a parent's wallet, independent of any
// request — `amount` can be negative to deduct. Always re-reads the current
// balance first rather than trusting a client-supplied "current" value, so
// a deduction can never be validated against stale data.
export async function adjustWalletBalance(parentId: string, amount: number, note?: string): Promise<ActionResult> {
  const supabase = await createClient()
  await requireAdmin()

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
  await requirePaymentsStaff()

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

  const roundedAmount = roundToCents(input.amount)
  const { data: recorded, error } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      classroom_id: student.classroom_id,
      fee_type: input.feeType,
      description,
      amount: roundedAmount,
      amount_paid: roundedAmount,
      status: 'paid',
      payment_method: input.method,
      transaction_date: new Date().toISOString(),
      recorded_by: actingAdmin?.id ?? null,
    })
    .select('id')
    .single()
  if (error || !recorded) {
    return { error: error?.message ?? 'Could not record the payment.' }
  }

  const { data: transaction, error: txError } = await supabase
    .from('payment_transactions')
    .insert({ payment_id: recorded.id, amount: roundedAmount, payment_method: input.method, recorded_by: actingAdmin?.id ?? null })
    .select('id')
    .single()
  if (txError) {
    console.error(`payment_transactions insert failed: ${txError.message}`)
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${input.method} payment of ${input.amount} for a student`,
    targetTable: 'payments',
    targetId: studentId,
  })

  // The receipt, by email, to the child's guardians (those who haven't turned emails off).
  if (transaction) await emailReceiptFor(transaction.id)

  revalidateAll()
}

// Marks an already-generated pending fee item (e.g. a classroom's tuition
// fee) as paid via cash, without touching the wallet — the counterpart to
// payAmountWithWallet for a payment made outside the app. `amount` defaults
// to the fee's full remaining balance (its old, whole-fee-only behavior);
// passing less records a partial cash payment, same idea as the wallet flow.
export async function markPaymentPaidManually(paymentId: string, method: string, amount?: number, notes?: string): Promise<ActionResult> {
  const supabase = await createClient()
  await requirePaymentsStaff()

  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return { error: 'Only cash payments can be recorded manually.' }
  }

  const { data: fee } = await supabase
    .from('payments')
    .select('id, amount, amount_paid, status')
    .eq('id', paymentId)
    .maybeSingle()
  if (!fee) return { error: 'This fee could not be found.' }
  if (fee.status !== 'pending') return { error: 'This payment could not be updated; it may have already been paid.' }

  const remaining = roundToCents(fee.amount - fee.amount_paid)
  const pay = amount === undefined ? remaining : roundToCents(amount)
  if (!Number.isFinite(pay) || pay <= 0) return { error: 'Enter a valid amount greater than zero.' }
  if (pay > remaining) return { error: `That is more than the ${remaining} still owed on this fee.` }

  const newAmountPaid = roundToCents(fee.amount_paid + pay)
  const nowPaidInFull = newAmountPaid >= fee.amount

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('payments')
    .update({
      amount_paid: newAmountPaid,
      status: nowPaidInFull ? 'paid' : 'pending',
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

  const { data: transaction, error: txError } = await supabase
    .from('payment_transactions')
    .insert({ payment_id: data.id, amount: pay, payment_method: method, recorded_by: actingAdmin?.id ?? null })
    .select('id')
    .single()
  if (txError) {
    console.error(`payment_transactions insert failed: ${txError.message}`)
  }

  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Recorded a manual ${method} payment of ${pay}${nowPaidInFull ? '' : ' (partial)'}`,
    targetTable: 'payments',
    targetId: paymentId,
  })

  if (transaction) await emailReceiptFor(transaction.id)

  revalidateAll()
}

// ---------------------------------------------------------------------------
// Fee corrections. Each needs a written reason, is guarded on the fee's current
// status (so a stale screen or two admins can't apply it twice), leaves a
// payment_adjustments row as the audit trail, and tells the child's parents in
// the bell. Waive/void/edit only ever touch a `pending` fee; reversing only a
// `paid` one.

type FeeRow = {
  id: string
  student_id: string
  amount: number
  amount_paid: number
  due_date: string | null
  description: string | null
  fee_type: string
}

function feeLabel(fee: { description: string | null; fee_type: string }) {
  return fee.description || `${fee.fee_type.charAt(0).toUpperCase()}${fee.fee_type.slice(1)} fee`
}

async function recordAdjustment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string,
  action: 'waived' | 'voided' | 'edited' | 'reversed',
  reason: string,
  adminId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
) {
  const { error } = await supabase
    .from('payment_adjustments')
    .insert({ payment_id: paymentId, action, reason: reason.trim(), before, after, created_by: adminId })
  // The correction itself already went through, so a failed audit row is logged
  // rather than reported as a failed correction.
  if (error) console.error(`payment_adjustments insert failed: ${error.message}`)
}

async function loadPendingFee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
): Promise<{ fee: FeeRow; error: null } | { fee: null; error: string }> {
  const { data } = await supabase
    .from('payments')
    .select('id, student_id, amount, amount_paid, due_date, description, fee_type, status')
    .eq('id', paymentId)
    .maybeSingle()
  if (!data) return { fee: null, error: 'That fee could not be found.' }
  if (data.status !== 'pending') {
    return { fee: null, error: 'Only an unpaid fee can be changed this way. It may already have been handled.' }
  }
  return { fee: data as FeeRow, error: null }
}

async function settleFee(paymentId: string, reason: string, kind: 'waived' | 'voided'): Promise<ActionResult> {
  const admin = await requireAdmin()
  const reasonError = validateFeeReason(reason)
  if (reasonError) return { error: reasonError }

  const supabase = await createClient()
  const { fee, error: loadError } = await loadPendingFee(supabase, paymentId)
  if (!fee) return { error: loadError }
  if (fee.amount_paid > 0) {
    return {
      error: `${formatCurrency(fee.amount_paid)} has already been paid toward this fee, so it can't be ${kind === 'waived' ? 'waived' : 'voided'}. Reverse the payment first if this fee should never have existed.`,
    }
  }

  const { data: updated, error } = await supabase
    .from('payments')
    .update({ status: kind })
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'This fee has already been handled.' }

  await recordAdjustment(supabase, paymentId, kind, reason, admin.id, { status: 'pending', amount: fee.amount }, { status: kind })
  await logActivity(supabase, {
    actorId: admin.id,
    action: `${kind === 'waived' ? 'Waived' : 'Voided'} a fee (${formatCurrency(fee.amount)}): ${reason.trim()}`,
    targetTable: 'payments',
    targetId: paymentId,
  })
  await notifyParentsOfStudent(fee.student_id, {
    kind: 'money',
    title: kind === 'waived' ? 'A fee was waived' : 'A fee was cancelled',
    body: `${feeLabel(fee)} (${formatCurrency(fee.amount)}) no longer needs to be paid.`,
    href: '/parent/payments',
  })
  revalidateAll()
}

export async function waiveFee(paymentId: string, reason: string): Promise<ActionResult> {
  return settleFee(paymentId, reason, 'waived')
}

export async function voidFee(paymentId: string, reason: string): Promise<ActionResult> {
  return settleFee(paymentId, reason, 'voided')
}

export async function editPendingFee(
  paymentId: string,
  changes: { amount: number; dueDate: string | null },
  reason: string
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const amount = roundToCents(changes.amount)
  const dueDate = changes.dueDate || null
  const problem = validateFeeAmount(amount) ?? validateFeeDueDate(dueDate) ?? validateFeeReason(reason)
  if (problem) return { error: problem }

  const supabase = await createClient()
  const { fee, error: loadError } = await loadPendingFee(supabase, paymentId)
  if (!fee) return { error: loadError }
  if (amount < fee.amount_paid) {
    return { error: `Can't set the amount below ${formatCurrency(fee.amount_paid)}, which has already been paid toward this fee.` }
  }
  if (amount === fee.amount && dueDate === fee.due_date) {
    return { error: 'Nothing was changed.' }
  }

  // Reducing the amount down to exactly what's already been paid closes the
  // fee out, the same as if that had been the last installment.
  const nowPaidInFull = amount === fee.amount_paid
  const { data: updated, error } = await supabase
    .from('payments')
    .update({ amount, due_date: dueDate, status: nowPaidInFull ? 'paid' : 'pending' })
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'This fee has already been handled.' }

  await recordAdjustment(
    supabase,
    paymentId,
    'edited',
    reason,
    admin.id,
    { amount: fee.amount, due_date: fee.due_date },
    { amount, due_date: dueDate }
  )
  await logActivity(supabase, {
    actorId: admin.id,
    action: `Edited a fee: ${formatCurrency(fee.amount)} to ${formatCurrency(amount)}${dueDate !== fee.due_date ? `, due ${dueDate ? formatDateShort(dueDate) : 'not set'}` : ''}`,
    targetTable: 'payments',
    targetId: paymentId,
  })
  await notifyParentsOfStudent(fee.student_id, {
    kind: 'money',
    title: 'A fee was updated',
    body: `${feeLabel(fee)} is now ${formatCurrency(amount)}${dueDate ? `, due ${formatDateShort(dueDate)}` : ''}.`,
    href: '/parent/payments',
  })
  revalidateAll()
}

// Undoes a payment recorded in error: back to pending, and a wallet payment is
// refunded to the wallet (with a ledger entry). Both happen inside the
// reverse_payment database function, in one transaction, so the wallet and the
// fee can never disagree the way two sequential writes could.
export async function reversePayment(paymentId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const reasonError = validateFeeReason(reason)
  if (reasonError) return { error: reasonError }

  const supabase = await createClient()
  const { data: before } = await supabase
    .from('payments')
    .select('student_id, amount, amount_paid, description, fee_type, payment_method')
    .eq('id', paymentId)
    .maybeSingle()
  const { data: walletRows } = await supabase
    .from('payment_transactions')
    .select('amount')
    .eq('payment_id', paymentId)
    .eq('payment_method', 'wallet')
    .is('reversed_at', null)
  const walletRefund = roundToCents((walletRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0))

  const { error } = await supabase.rpc('reverse_payment', { p_payment_id: paymentId, p_reason: reason.trim() })
  if (error) {
    const messages: Record<string, string> = {
      NOT_ADMIN: 'Only an admin can reverse a payment.',
      REASON_REQUIRED: 'Add a short reason so there is a record of why.',
      PAYMENT_NOT_FOUND: 'That payment could not be found.',
      PAYMENT_NOT_PAID: 'Nothing has been paid toward this fee, so there is nothing to reverse.',
      WALLET_NOT_FOUND: "The paying parent's wallet could not be found, so it could not be refunded.",
      PAYER_UNKNOWN:
        'This wallet payment cannot be refunded automatically because more than one parent is linked to the child and it is not recorded who paid. Refund the right parent with Adjust in Parent Wallets, then reverse the payment as cash.',
    }
    const code = Object.keys(messages).find((c) => error.message.includes(c))
    return { error: code ? messages[code] : error.message }
  }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Reversed a payment${before ? ` (${formatCurrency(before.amount_paid)} of ${formatCurrency(before.amount)})` : ''}: ${reason.trim()}`,
    targetTable: 'payments',
    targetId: paymentId,
  })
  if (before) {
    await notifyParentsOfStudent(before.student_id, {
      kind: 'money',
      title: 'A payment was reversed',
      body: `${feeLabel(before)} (${formatCurrency(before.amount)}) is unpaid again${
        walletRefund > 0 ? `, and ${formatCurrency(walletRefund)} was returned to your wallet` : ''
      }.`,
      href: '/parent/payments',
    })
  }
  revalidateAll()
}

// Creates a new unpaid fee for a student, tied to a classroom — the one
// thing admin couldn't do before: every other fee only ever came from
// auto-generation at classroom assignment, or an already-paid manual cash
// record (recordManualPayment, above). Tuition is a one-time payment at
// this school, so adding a second tuition fee for a (student, classroom)
// pair that already has one needs an explicit confirm rather than either
// silently allowing it or silently refusing a legitimate correction.
export async function addPendingFee(
  studentId: string,
  input: {
    classroomId: string
    feeType: string
    description: string
    amount: number
    dueDate: string | null
    confirmed?: boolean
  }
): Promise<ActionResult | { warning: string }> {
  const supabase = await createClient()
  const admin = await requireAdmin()

  if (!FEE_TYPES.includes(input.feeType as (typeof FEE_TYPES)[number])) {
    return { error: 'Invalid fee type.' }
  }
  const amount = roundToCents(input.amount)
  const problem = validateFeeAmount(amount) ?? validateFeeDueDate(input.dueDate)
  if (problem) return { error: problem }
  const description = input.description.trim()
  if (!description) return { error: 'Enter a short description for this fee.' }

  const { data: classroom } = await supabase.from('classrooms').select('id, name').eq('id', input.classroomId).maybeSingle()
  if (!classroom) return { error: 'Select a classroom.' }

  const { data: student } = await supabase.from('students').select('id').eq('id', studentId).maybeSingle()
  if (!student) return { error: 'Student not found.' }

  if (input.feeType === 'tuition' && !input.confirmed) {
    const { data: existingTuition } = await supabase
      .from('payments')
      .select('id')
      .eq('student_id', studentId)
      .eq('classroom_id', classroom.id)
      .eq('fee_type', 'tuition')
      .limit(1)
    if (existingTuition && existingTuition.length > 0) {
      return { warning: 'This student already has a tuition fee for this classroom.' }
    }
  }

  const { data: created, error } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      classroom_id: classroom.id,
      fee_type: input.feeType,
      description,
      amount,
      amount_paid: 0,
      status: 'pending',
      due_date: input.dueDate,
    })
    .select('id')
    .single()
  if (error || !created) {
    return { error: error?.message ?? 'Could not add the fee.' }
  }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Added a fee (${formatCurrency(amount)}) for a student, ${classroom.name}`,
    targetTable: 'payments',
    targetId: created.id,
  })

  await notifyParentsOfStudent(studentId, {
    kind: 'money',
    title: 'A new fee was added',
    body: `${description} (${formatCurrency(amount)}) has been added to your account.`,
    href: '/parent/payments',
  })

  revalidateAll()
}
