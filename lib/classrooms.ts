import { isValidDob, MAX_AGE } from '@/lib/dob'

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

export function classroomAgeRangeLabel(classroom: { min_age_years: number | null; max_age_years: number | null }): string {
  if (classroom.min_age_years == null && classroom.max_age_years == null) return 'All ages'
  return `Ages ${classroom.min_age_years}-${classroom.max_age_years}`
}
