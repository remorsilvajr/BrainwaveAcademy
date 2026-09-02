// Shared date-of-birth sanity checks. Used anywhere a DOB is accepted
// (enroll forms, My Profile edits, admin-side student/teacher/user record
// edits) so "negative age" (future date) and "over 100 years old" can't
// slip through on any one surface while being caught on the others —
// found via retro pen-testing that these were previously unvalidated.
export const MIN_STUDENT_AGE = 2
export const MIN_ADULT_AGE = 18
export const MAX_AGE = 100

function parseDob(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function yearsAgo(years: number): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date
}

export function isValidDob(
  value: string,
  { minAge = 0, maxAge = MAX_AGE }: { minAge?: number; maxAge?: number } = {}
): boolean {
  const date = parseDob(value)
  if (!date) return false
  if (date > new Date()) return false // future date -> negative age
  if (date > yearsAgo(minAge)) return false // younger than the minimum allowed age
  if (date < yearsAgo(maxAge)) return false // older than the maximum allowed age
  return true
}

export function dobRangeMessage(subject: string, minAge: number, maxAge: number = MAX_AGE): string {
  return `Please enter a valid date of birth. ${subject} must be between ${minAge} and ${maxAge} years old.`
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// For a date-of-birth <input type="date">: the latest selectable date is
// the one that makes someone exactly minAge today, and the earliest is the
// one that makes someone exactly maxAge today — these are just the HTML
// min/max attributes for client-side UX (a native date picker constraint),
// the actual enforcement is isValidDob() server-side.
export function dobInputMax(minAge: number): string {
  return toIsoDate(yearsAgo(minAge))
}

export function dobInputMin(maxAge: number = MAX_AGE): string {
  return toIsoDate(yearsAgo(maxAge))
}
