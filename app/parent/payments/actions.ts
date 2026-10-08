'use server'

import { revalidatePath } from 'next/cache'
import { formatCurrency } from '@/lib/format'
import { notifyAdmins } from '@/lib/notify'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { emailReceiptFor } from '@/lib/send-receipt'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please log in and try again.',
  INVALID_AMOUNT: 'Enter a valid amount greater than zero.',
  NOT_AUTHORIZED: 'These fees do not belong to one of your children.',
  AMOUNT_EXCEEDS_OUTSTANDING: "That's more than this child's total outstanding balance.",
  INSUFFICIENT_BALANCE: 'Your wallet balance is not enough to cover that amount.',
}

// Calls the pay_amount_with_wallet() Postgres function (SECURITY DEFINER, see
// the schema note in CLAUDE.md) via the ordinary RLS-scoped client — this
// is a deliberate, singular use of .rpc() in an app that otherwise avoids
// it, because the wallet debit and the fee allocation must succeed or fail
// together. The function derives the caller's identity from auth.uid()
// internally, not from anything this action passes in, so it can't be used
// to pay someone else's fees from your own wallet or vice versa.
//
// Pays down the given amount across the student's outstanding fees, soonest
// due first, potentially only partially settling the last one it touches —
// see CLAUDE.md for why this replaced the old one-fee-at-a-time
// payFeeWithWallet. The RPC returns the id of every payment_transactions row
// it created, one per fee it touched, so a receipt goes out for each.
export async function payAmountWithWallet(studentId: string, amount: number): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: transactionIds, error } = await supabase.rpc('pay_amount_with_wallet', {
    p_student_id: studentId,
    p_amount: amount,
  })

  if (error) {
    const message = ERROR_MESSAGES[error.message] ?? 'Something went wrong processing this payment.'
    return { error: message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Paid ${amount} toward outstanding fees using their wallet balance`,
    targetTable: 'payments',
    targetId: studentId,
  })

  // The receipt, by email, for each fee this payment touched (to the parent
  // who paid, unless they turned emails off).
  for (const transactionId of transactionIds ?? []) {
    await emailReceiptFor(transactionId)
  }

  revalidatePath('/parent/payments')
  revalidatePath('/parent', 'layout')
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
