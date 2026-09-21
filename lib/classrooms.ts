import { isRealIsoDate, MAX_AGE, wholeMonthsOld } from '@/lib/dob'
import { todayIso } from '@/lib/format'

// A classroom's age bounds (`min_age_months`/`max_age_months`) are whole
// completed months, both inclusive, and null when the program has no age
// restriction on that side. Little Explorers, for example, is 18-24 months:
// a child stays eligible until the day they turn 2 years 1 month.
export function isAgeEligibleForClassroom(
  dateOfBirth: string,
  classroom: { min_age_months: number | null; max_age_months: number | null }
): boolean {
  if (classroom.min_age_months == null && classroom.max_age_months == null) return true
  if (!isRealIsoDate(dateOfBirth)) return false
  const today = todayIso()
  if (dateOfBirth > today) return false
  const months = wholeMonthsOld(dateOfBirth, today)
  return months >= (classroom.min_age_months ?? 0) && months <= (classroom.max_age_months ?? MAX_AGE * 12)
}

// The two support programs are sessions, not a school day, so they have no
// daily attendance: their students are left out of the attendance roster and
// its counts, and recordAttendance refuses them. A student's regular program
// (or having no program yet) is unaffected. Keyed by the seeded `slug`, not the
// display name, so renaming a program can't silently turn attendance back on.
export const NON_DAILY_ATTENDANCE_SLUGS: readonly string[] = ['academic-tutorials', 'quiz-bee-exam-prep']

export function tracksDailyAttendance(classroom: { slug: string } | null | undefined): boolean {
  return !classroom || !NON_DAILY_ATTENDANCE_SLUGS.includes(classroom.slug)
}

// IDs of the programs above, from a classrooms list that includes `slug`.
export function nonDailyClassroomIds(classrooms: { id: string; slug: string }[]): Set<string> {
  return new Set(classrooms.filter((c) => !tracksDailyAttendance(c)).map((c) => c.id))
}

// "2 yrs 1 mo", "2 yrs", "1 yr 6 mo" from a month count.
function monthsLabel(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  const parts: string[] = []
  if (y > 0 || m === 0) parts.push(`${y} ${y === 1 ? 'yr' : 'yrs'}`)
  if (m > 0) parts.push(`${m} mo`)
  return parts.join(' ')
}

export function classroomAgeRangeLabel(classroom: { min_age_months: number | null; max_age_months: number | null }): string {
  const { min_age_months: min, max_age_months: max } = classroom
  if (min == null && max == null) return 'All ages'
  // Whole-year programs (Tutorial, Quiz Bee: 60-227) read as "Ages 5-18".
  if (min != null && max != null && min % 12 === 0 && (max + 1) % 12 === 0) {
    return `Ages ${min / 12}-${(max + 1) / 12 - 1}`
  }
  if (min != null && max != null) return `Ages ${monthsLabel(min)} - ${monthsLabel(max)}`
  if (min != null) return `Ages ${monthsLabel(min)} and up`
  return `Up to ${monthsLabel(max as number)}`
}

// Fee amounts are fixed (no UI or action changes them); only the two due dates
// are editable, and only within a realistic window: from today (Manila) through
// the end of next year. A past date would make every newly assigned student's
// fee overdue on day one, and a date years out is almost certainly a typo.
export function feeDueDateBounds() {
  const today = todayIso()
  return { min: today, max: `${Number(today.slice(0, 4)) + 1}-12-31` }
}

// Returns an error message, or null when `value` (YYYY-MM-DD) is a real calendar
// date inside the allowed window. Run server-side too: a date input's min/max
// is UX only.
export function validateFeeDueDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date.'
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'Enter a valid date.'
  const { min, max } = feeDueDateBounds()
  if (value < min || value > max) {
    return `Due dates must be between today and December 31, ${max.slice(0, 4)}.`
  }
  return null
}
