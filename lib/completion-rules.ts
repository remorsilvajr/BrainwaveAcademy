import { wholeMonthsOld } from '@/lib/dob'
import { PROMOTION_LADDER } from '@/lib/promotion'

// Client-safe half of lib/completion.ts (no server imports), so screens can show
// "Pending Completion" and the right buttons.

export const FINAL_CLASS_SLUG = PROMOTION_LADDER[PROMOTION_LADDER.length - 1]

// Past the last class's upper age (whole months, so 59+ for 47-58).
export function hasOutgrownFinalClass(dateOfBirth: string, classroom: { slug: string; max_age_months: number | null } | null | undefined, today: string): boolean {
  if (!classroom || classroom.slug !== FINAL_CLASS_SLUG || classroom.max_age_months == null) return false
  return wholeMonthsOld(dateOfBirth, today) > classroom.max_age_months
}

// Done here but still owing: stays a normal student until the balance is zero.
export function isPendingCompletion(
  student: { enrollment_status: string; date_of_birth: string },
  classroom: { slug: string; max_age_months: number | null } | null | undefined,
  owed: number,
  today: string
): boolean {
  return student.enrollment_status === 'active' && owed > 0 && hasOutgrownFinalClass(student.date_of_birth, classroom, today)
}

// What a status reads as on screen: 'graduated' is stored, "Completed Preschool" is shown.
export function studentStatusLabel(status: string): string {
  if (status === 'graduated') return 'Completed Preschool'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
