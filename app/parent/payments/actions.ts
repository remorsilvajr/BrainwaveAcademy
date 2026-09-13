'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

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
export async function payFeeWithWallet(paymentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('pay_fee_with_wallet', { p_payment_id: paymentId })

  if (error) {
    const message = ERROR_MESSAGES[error.message] ?? 'Something went wrong processing this payment.'
    throw new Error(message)
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

  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')

  return data
}
