import { roundToCents, todayIso } from '@/lib/format'

// One unpaid fee line, as shown per child in the admin Student Record. A fee
// can now be partially paid (amount_paid > 0 while still status: 'pending'),
// so the remaining balance is amount - amount_paid, not amount.
export type UnpaidFee = {
  id: string
  fee_type: string
  description: string | null
  amount: number
  amount_paid: number
  due_date: string | null
}

type FeeLike = { status: string; due_date: string | null }

// "Overdue" is display-only (no scheduled job flips the status column), so this
// is the one place that decides it. Compares against Manila's today, not the
// runtime's UTC date, which is up to 8 hours behind the school's calendar.
export function isOverdue(p: FeeLike) {
  return p.status === 'pending' && !!p.due_date && p.due_date < todayIso()
}

// The remaining balance on a fee: its full amount once, minus whatever has
// already been paid toward it in installments.
export function remainingBalance(row: { amount: number; amount_paid: number }) {
  return roundToCents(row.amount - row.amount_paid)
}

// Outstanding = the remaining balance of every `pending` fee (overdue ones
// included, they're a subset; a partially-paid fee's already-paid portion is
// excluded), the same definition the parent dashboard's Due Balance uses, so
// the two portals always agree.
export function summarizeOutstanding(rows: (FeeLike & { amount: number; amount_paid: number })[]) {
  let outstanding = 0
  let overdue = 0
  let outstandingCount = 0
  let overdueCount = 0
  for (const row of rows) {
    if (row.status !== 'pending') continue
    const remaining = remainingBalance(row)
    outstanding += remaining
    outstandingCount += 1
    if (isOverdue(row)) {
      overdue += remaining
      overdueCount += 1
    }
  }
  return {
    outstanding: roundToCents(outstanding),
    overdue: roundToCents(overdue),
    outstandingCount,
    overdueCount,
  }
}
