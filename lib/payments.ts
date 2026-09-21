import { roundToCents, todayIso } from '@/lib/format'

type FeeLike = { status: string; due_date: string | null }

// "Overdue" is display-only (no scheduled job flips the status column), so this
// is the one place that decides it. Compares against Manila's today, not the
// runtime's UTC date, which is up to 8 hours behind the school's calendar.
export function isOverdue(p: FeeLike) {
  return p.status === 'pending' && !!p.due_date && p.due_date < todayIso()
}

// Outstanding = every `pending` fee (overdue ones included, they're a subset),
// the same definition the parent dashboard's Due Balance uses, so the two
// portals always agree.
export function summarizeOutstanding(rows: (FeeLike & { amount: number })[]) {
  let outstanding = 0
  let overdue = 0
  let outstandingCount = 0
  let overdueCount = 0
  for (const row of rows) {
    if (row.status !== 'pending') continue
    outstanding += row.amount
    outstandingCount += 1
    if (isOverdue(row)) {
      overdue += row.amount
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
