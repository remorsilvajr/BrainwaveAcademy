import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'

// URL params (`?date=`, `?month=`) are attacker-controlled, so a page must
// never hand one straight to a query or a calendar. Anything malformed falls
// back to today / this month instead of rendering NaN or erroring.

// A real, non-future YYYY-MM-DD; otherwise today (Manila).
export function attendanceDateFromParam(value: string | undefined): string {
  const today = todayIso()
  return value && isRealIsoDate(value) && value <= today ? value : today
}

// "YYYY-MM" with a real month 01-12 in a sane year; otherwise this month.
export function monthFromParam(value: string | undefined): string {
  const match = value ? /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value) : null
  if (match && Number(match[1]) >= 2000 && Number(match[1]) <= 2100) return value as string
  return todayIso().slice(0, 7)
}
