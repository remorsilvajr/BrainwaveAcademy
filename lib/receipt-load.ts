import type { SupabaseClient } from '@supabase/supabase-js'
import { roundToCents } from '@/lib/format'

export type ReceiptTransaction = {
  id: string
  receipt_ref: string | null
  transaction_date: string
  payment_method: string
  amount: number
}

// A fee can be paid in installments, so a receipt is for one payment
// (payment_transactions row): the one named by `?tx=`, or the fee's latest one.
// A reversed payment has no receipt. Runs on the caller's own client, so RLS
// still decides whose payments can be read. Also returns the fee's total paid
// up to and including this payment, so a part payment can show what was left.
export async function loadReceiptTransaction(
  supabase: SupabaseClient,
  paymentId: string,
  txId: string | undefined
): Promise<{ transaction: ReceiptTransaction; paidSoFar: number } | null> {
  const { data } = await supabase
    .from('payment_transactions')
    .select('id, receipt_ref, transaction_date, payment_method, amount')
    .eq('payment_id', paymentId)
    .is('reversed_at', null)
    .order('transaction_date', { ascending: true })
  const rows = (data ?? []) as ReceiptTransaction[]
  if (rows.length === 0) return null
  const index = txId ? rows.findIndex((r) => r.id === txId) : rows.length - 1
  if (index < 0) return null
  const paidSoFar = roundToCents(rows.slice(0, index + 1).reduce((sum, r) => sum + Number(r.amount), 0))
  return { transaction: rows[index], paidSoFar }
}
