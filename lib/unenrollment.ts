import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'

export const UNENROLLMENT_REASON_MIN = 5
export const UNENROLLMENT_REASON_MAX = 1000

export type UnenrollmentStatus = 'pending' | 'approved' | 'declined' | 'cancelled'
export type FeeDecision = 'keep' | 'waive'

// The last day the child attends: today through the end of next year. Not in the
// past (that would just be a back-dated exit), and not years away (a typo).
export function lastDayBounds() {
  const today = todayIso()
  return { min: today, max: `${Number(today.slice(0, 4)) + 1}-12-31` }
}

export function validateLastDay(value: string): string | null {
  if (!isRealIsoDate(value)) return 'Choose a valid last day.'
  const { min, max } = lastDayBounds()
  if (value < min || value > max) return `The last day must be between today and December 31, ${max.slice(0, 4)}.`
  return null
}

export function validateReason(value: string): string | null {
  const reason = value.trim()
  if (reason.length < UNENROLLMENT_REASON_MIN) return 'Please tell us why, in a few words.'
  if (reason.length > UNENROLLMENT_REASON_MAX) return `The reason must be ${UNENROLLMENT_REASON_MAX} characters or fewer.`
  return null
}
