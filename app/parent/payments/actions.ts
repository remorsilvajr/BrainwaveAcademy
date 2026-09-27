'use server'

import { revalidatePath } from 'next/cache'
import { formatCurrency } from '@/lib/format'
import { notifyAdmins } from '@/lib/notify'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { emailReceiptFor } from '@/lib/send-receipt'
import { createCheckoutSession } from '@/lib/paymongo'
import { getSiteUrl } from '@/lib/site-url'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please log in and try again.',
  PAYMENT_NOT_FOUND: 'This fee could not be found.',
  PAYMENT_NOT_PENDING: 'This fee has already been paid.',
  NOT_AUTHORIZED: 'This fee does not belong to one of your children.',
  INSUFFICIENT_BALANCE: 'Your wallet balance is not enough to cover this fee.',
}

// Calls the pay_fee_with_wallet() Postgres function (SECURITY DEFINER, see
// the schema note in CLAUDE.md) via the ordinary RLS-scoped client — this
// is a deliberate, singular use of .rpc() in an app that otherwise avoids
// it, because the wallet debit and the payment status flip must succeed or
// fail together. Two sequential .update() calls through the query builder
// can't offer that: a failure between them would leave a parent's wallet
// debited with no payment marked paid. The function derives the caller's
// identity from auth.uid() internally, not from anything this action
// passes in, so it can't be used to pay someone else's fee from your own
// wallet or vice versa.
export async function payFeeWithWallet(paymentId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('pay_fee_with_wallet', { p_payment_id: paymentId })

  if (error) {
    const message = ERROR_MESSAGES[error.message] ?? 'Something went wrong processing this payment.'
    return { error: message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Paid a fee using their wallet balance',
    targetTable: 'payments',
    targetId: paymentId,
  })

  // The receipt, by email (to the parent who paid, unless they turned emails off).
  await emailReceiptFor(paymentId)

  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
}

// PayMongo test mode (see CLAUDE.md): creates a hosted Checkout Session and
// hands back its URL for the browser to navigate to. This action never
// marks the fee paid — only the webhook (app/api/webhooks/paymongo/route.ts)
// does that, once PayMongo confirms the payment actually happened. Reading
// the payment through the parent's own RLS-scoped client is the
// authorization check here (parents_view_child_payments already restricts
// this to their own children, same trust-RLS pattern the receipt page uses).
export async function createPaymongoCheckout(paymentId: string): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in and try again.' }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, status, amount, description, fee_type, receipt_ref')
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment) return { error: 'This fee does not belong to one of your children.' }
  if (payment.status !== 'pending') return { error: 'This fee has already been paid.' }

  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) return { error: 'Online payment is not configured yet. Please try Pay with Wallet instead.' }

  const admin = createAdminClient()
  const { error: sessionInsertError } = await admin.from('payment_gateway_sessions').insert({
    payment_id: payment.id,
    provider: 'paymongo',
    provider_session_id: `pending-${payment.id}-${Date.now()}`,
    status: 'pending',
    parent_id: user.id,
  })
  if (sessionInsertError) {
    return { error: 'Something went wrong starting the online payment. Please try again.' }
  }

  const description = payment.description || `${payment.fee_type.charAt(0).toUpperCase()}${payment.fee_type.slice(1)} fee`
  const siteUrl = getSiteUrl()
  const result = await createCheckoutSession(secretKey, {
    amount: payment.amount,
    description,
    referenceNumber: payment.receipt_ref ?? payment.id,
    successUrl: `${siteUrl}/parent/payments?paymongo=success`,
    cancelUrl: `${siteUrl}/parent/payments?paymongo=cancelled`,
    metadata: { payment_id: payment.id, parent_id: user.id },
  })

  if ('error' in result) {
    return { error: result.error }
  }

  // Replace the placeholder provider_session_id with PayMongo's real one, now that we have it.
  await admin
    .from('payment_gateway_sessions')
    .update({ provider_session_id: result.id })
    .eq('payment_id', payment.id)
    .eq('status', 'pending')

  return { url: result.checkoutUrl }
}

// Parents can't credit their own wallet directly (wallets has no parent
// write policy at all, see the schema note in CLAUDE.md) — this only ever
// creates a pending request. Admin decides the actual amount credited,
// which can differ from what's requested here; see approveWalletRequest.
export async function requestWalletFunds(amount: number, note: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Enter a valid amount greater than zero.' }
  }

  const { error } = await supabase.from('wallet_requests').insert({
    parent_id: user?.id ?? '',
    requested_amount: amount,
    note: note.trim() || null,
  })

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Requested ${amount} added to their wallet`,
    targetTable: 'wallet_requests',
    targetId: user?.id ?? undefined,
  })

  await notifyAdmins({
    kind: 'request',
    title: 'New wallet fund request',
    body: `A parent asked for ${formatCurrency(amount)} to be added to their wallet.`,
    href: '/admin/payments?tab=requests',
  })

  revalidatePath('/parent/payments')
}
