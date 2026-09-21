import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { isValidEmail, EMAIL_VALIDATION_MESSAGE } from '@/lib/email-validation'
import { isValidPhilippineMobile, PHONE_VALIDATION_MESSAGE } from '@/lib/phone'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { passwordRequirements } from '@/lib/password-rules'

// Client-side mirror of the enroll forms' server checks (app/enroll/actions.ts,
// app/parent/enroll-a-student/actions.ts), so a mistake shows the moment someone
// leaves a field or a step instead of only after Submit. UX only: the Server
// Actions still validate everything (this file cannot know about breached or
// common passwords, or whether an email already has an account). Client-safe: no
// Node or server imports.

export type EnrollValues = Record<string, string | undefined>

type ClassroomAges = { id: string; min_age_months: number | null; max_age_months: number | null }

export const STUDENT_KEYS = ['student_first_name', 'student_middle_name', 'student_last_name', 'student_dob', 'student_gender']
export const PROGRAM_KEYS = ['requested_classroom_id']
export const PARENT_KEYS = [
  'parent_first_name',
  'parent_middle_name',
  'parent_last_name',
  'parent_dob',
  'parent_relationship',
  'parent_contact_number',
  'parent_email',
  'password',
  'confirm_password',
]

const REQUIRED_LABELS: Record<string, string> = {
  student_first_name: 'Student first name',
  student_last_name: 'Student last name',
  student_dob: "Student's date of birth",
  student_gender: 'Student gender',
  requested_classroom_id: 'Program selection',
  parent_first_name: 'Parent first name',
  parent_last_name: 'Parent last name',
  parent_dob: "Parent's date of birth",
  parent_relationship: 'Relationship',
  parent_contact_number: 'Contact number',
  parent_email: 'Email address',
}

const NAME_KEYS = [
  'student_first_name',
  'student_middle_name',
  'student_last_name',
  'parent_first_name',
  'parent_middle_name',
  'parent_last_name',
]

export function validateEnrollField(
  key: string,
  values: EnrollValues,
  classrooms: ClassroomAges[] = []
): string | undefined {
  const value = (values[key] ?? '').trim()

  if (key === 'password') {
    const password = values.password ?? ''
    if (!password) return 'Password is required.'
    const unmet = passwordRequirements.filter((r) => !r.test(password))
    if (unmet.length > 0) return `Your password must ${unmet.map((r) => r.phrase).join(', and ')}.`
    return undefined
  }
  if (key === 'confirm_password') {
    const confirm = values.confirm_password ?? ''
    if (!confirm) return 'Confirm your password.'
    if (confirm !== (values.password ?? '')) return 'The two passwords do not match.'
    return undefined
  }

  if (!value) {
    const label = REQUIRED_LABELS[key]
    return label ? `${label} is required.` : undefined
  }

  if (NAME_KEYS.includes(key)) return isValidName(value) ? undefined : NAME_VALIDATION_MESSAGE
  if (key === 'parent_email') return isValidEmail(value) ? undefined : EMAIL_VALIDATION_MESSAGE
  if (key === 'parent_contact_number') return isValidPhilippineMobile(value) ? undefined : PHONE_VALIDATION_MESSAGE

  if (key === 'student_dob') {
    return isValidDob(value, { minAge: MIN_STUDENT_AGE, maxAge: MAX_STUDENT_AGE })
      ? undefined
      : dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_STUDENT_AGE)
  }
  if (key === 'parent_dob') {
    if (!isValidDob(value, { minAge: MIN_ADULT_AGE, maxAge: MAX_AGE })) return dobRangeMessage('Parent', MIN_ADULT_AGE, MAX_AGE)
    const studentDob = (values.student_dob ?? '').trim()
    if (studentDob && isValidDob(studentDob, { minAge: MIN_STUDENT_AGE, maxAge: MAX_STUDENT_AGE })) {
      const minParentDob = new Date(studentDob)
      minParentDob.setFullYear(minParentDob.getFullYear() - 10)
      if (new Date(value) > minParentDob) {
        return 'Parent must be at least 10 years older than the student. Please check the date of birth.'
      }
    }
    return undefined
  }

  if (key === 'requested_classroom_id') {
    const classroom = classrooms.find((c) => c.id === value)
    if (!classroom) return 'Please select a valid program.'
    const dob = (values.student_dob ?? '').trim()
    if (dob && !isAgeEligibleForClassroom(dob, classroom)) return "The selected program isn't available for this student's age."
  }
  return undefined
}

// Every problem among `keys`, keyed by field name.
export function validateEnrollFields(
  keys: string[],
  values: EnrollValues,
  classrooms: ClassroomAges[] = []
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of keys) {
    const message = validateEnrollField(key, values, classrooms)
    if (message) errors[key] = message
  }
  return errors
}
