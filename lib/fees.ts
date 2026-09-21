import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'

export const FEE_REASON_MIN = 5
export const FEE_REASON_MAX = 500
export const FEE_MAX_AMOUNT = 1_000_000

// What can be done to a fee (a `payments` row), by its status:
// - pending: edit the amount/due date, waive it (forgiven, kept in history), or
//   void it (should never have existed).
// - paid: reverse it (back to pending; a wallet payment is refunded).
// - waived / voided: nothing further, just the recorded history.
// Every action needs a written reason and leaves a payment_adjustments row.
export type FeeAdjustmentAction = 'waived' | 'voided' | 'edited' | 'reversed'

export const feeAdjustmentLabels: Record<FeeAdjustmentAction, string> = {
  waived: 'Waived',
  voided: 'Voided',
  edited: 'Edited',
  reversed: 'Payment reversed',
}

export function validateFeeReason(value: string): string | null {
  const reason = value.trim()
  if (reason.length < FEE_REASON_MIN) return 'Add a short reason (at least a few words) so there is a record of why.'
  if (reason.length > FEE_REASON_MAX) return `The reason must be ${FEE_REASON_MAX} characters or fewer.`
  return null
}

export function validateFeeAmount(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return 'Enter an amount greater than zero.'
  if (value > FEE_MAX_AMOUNT) return 'That amount is too large. Check for a typo.'
  return null
}

// A pending fee's due date may already have passed (that is what "overdue"
// means), so the window opens at the start of last year and closes at the end of
// next year. Empty means "no due date".
export function validateFeeDueDate(value: string | null): string | null {
  if (!value) return null
  if (!isRealIsoDate(value)) return 'Enter a valid due date.'
  const thisYear = Number(todayIso().slice(0, 4))
  const year = Number(value.slice(0, 4))
  if (year < thisYear - 1 || year > thisYear + 1) return `The due date must fall between ${thisYear - 1} and ${thisYear + 1}.`
  return null
}

export type FeeAdjustment = {
  id: string
  action: FeeAdjustmentAction
  reason: string
  created_at: string
}
