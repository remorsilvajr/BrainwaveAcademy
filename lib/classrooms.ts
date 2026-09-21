import { isValidDob, MAX_AGE } from '@/lib/dob'
import { todayIso } from '@/lib/format'

// A classroom's age bounds are null when the program has no age
// restriction (Nursery, Kinder, and both support programs — see CLAUDE.md's
// Classrooms & fee schedule note for why only Little Explorers and
// Advanced Toddler currently have bounds). isValidDob already treats a
// missing bound as "no restriction on that side," so passing 0/MAX through
// when a bound is null reuses the exact same age-gate logic as every other
// DOB check in this app rather than a bespoke one just for classrooms.
export function isAgeEligibleForClassroom(
  dateOfBirth: string,
  classroom: { min_age_years: number | null; max_age_years: number | null }
): boolean {
  if (classroom.min_age_years == null && classroom.max_age_years == null) return true
  return isValidDob(dateOfBirth, {
    minAge: classroom.min_age_years ?? 0,
    maxAge: classroom.max_age_years ?? MAX_AGE,
  })
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

export function classroomAgeRangeLabel(classroom: { min_age_years: number | null; max_age_years: number | null }): string {
  if (classroom.min_age_years == null && classroom.max_age_years == null) return 'All ages'
  return `Ages ${classroom.min_age_years}-${classroom.max_age_years}`
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
