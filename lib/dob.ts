import { todayIso } from '@/lib/format'

// Shared date-of-birth sanity checks. Used anywhere a DOB is accepted
// (enroll forms, My Profile edits, admin-side student/teacher/user record
// edits) so "negative age" (future date) and "over 100 years old" can't
// slip through on any one surface while being caught on the others —
// found via retro pen-testing that these were previously unvalidated.
export const MIN_STUDENT_AGE = 2
// The oldest a student can be: Academic Tutorials and Quiz Bee & Exam Prep are
// set to ages 5-18, so the cap can't be lower than 18 or those programs could
// never take an older student. Anything beyond is almost certainly a typo in the
// date of birth. Keep this at or above every program's max_age_years.
export const MAX_STUDENT_AGE = 18
export const MIN_ADULT_AGE = 18
export const MAX_AGE = 100

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// A strict, real calendar date in YYYY-MM-DD form. `new Date(value)` alone is
// far too forgiving for a server-side check: it turns "2023-02-30" into March 2
// and accepts "1/2/2023" or "March 5 2023", none of which a database date
// column should ever be handed.
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

// Whole years old on `today` (defaults to Manila's today, not the runtime's
// local date), by calendar comparison, so a birthday counts on the day itself.
export function wholeYearsOld(dob: string, today: string = todayIso()): number {
  const [by, bm, bd] = dob.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  const beforeBirthday = tm < bm || (tm === bm && td < bd)
  return ty - by - (beforeBirthday ? 1 : 0)
}

// `minAge`/`maxAge` are ages in whole years, both inclusive: maxAge 12 allows
// anyone up to their 13th birthday, the way "Ages 2-3" reads to a parent.
export function isValidDob(
  value: string,
  { minAge = 0, maxAge = MAX_AGE }: { minAge?: number; maxAge?: number } = {}
): boolean {
  if (!isRealIsoDate(value)) return false
  const today = todayIso()
  if (value > today) return false // future date -> negative age
  const age = wholeYearsOld(value, today)
  return age >= minAge && age <= maxAge
}

export function dobRangeMessage(subject: string, minAge: number, maxAge: number = MAX_AGE): string {
  return `Please enter a valid date of birth. ${subject} must be between ${minAge} and ${maxAge} years old.`
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// today minus N years, keeping the month/day (Feb 29 falls back to Feb 28 when
// the target year isn't a leap year).
function yearsBefore(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = y - years
  const isLeap = (target % 4 === 0 && target % 100 !== 0) || target % 400 === 0
  const day = m === 2 && d === 29 && !isLeap ? 28 : d
  return `${String(target).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Client-side bounds for the DOB pickers (UX only; the real enforcement is
// isValidDob() server-side): the latest date is the one that makes someone
// exactly minAge today, the earliest is the day after their (maxAge + 1)th
// birthday would have fallen, i.e. the oldest still allowed.
export function dobInputMax(minAge: number): string {
  return yearsBefore(todayIso(), minAge)
}

export function dobInputMin(maxAge: number = MAX_AGE): string {
  return addDays(yearsBefore(todayIso(), maxAge + 1), 1)
}
