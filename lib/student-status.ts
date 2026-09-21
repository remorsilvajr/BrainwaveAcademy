// A student's `enrollment_status` (free text in the database):
// - 'active': currently enrolled.
// - 'inactive': set only as a side effect of blocking/deactivating the parent's
//   account (see syncLinkedStudentsStatus in app/admin/user-management/actions.ts),
//   and reversed when that account is active again.
// - 'withdrawn': the family unenrolled (an approved unenrollment request, or an
//   admin withdrawal). Terminal: nothing flips it back automatically.
// - 'graduated': finished the program (year-end promotion). Terminal.
//
// Terminal students keep every record (attendance, milestones, payments,
// receipts) but drop out of the working views: attendance rosters, classroom
// rosters, pickup verification, and the parent album.
export const TERMINAL_STUDENT_STATUSES = ['withdrawn', 'graduated'] as const

export function isTerminalStudentStatus(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_STUDENT_STATUSES as readonly string[]).includes(status)
}

// PostgREST filter value for `.not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)`.
export const TERMINAL_STATUS_FILTER = `(${TERMINAL_STUDENT_STATUSES.join(',')})`
