'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SubmitStudentState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const requiredFields: Record<string, string> = {
  student_first_name: 'Student first name',
  student_last_name: 'Student last name',
  student_dob: "Student's date of birth",
  student_gender: 'Student gender',
}

const allFieldKeys = [...Object.keys(requiredFields), 'student_middle_name']
const nameFields = ['student_first_name', 'student_middle_name', 'student_last_name']
const NAME_PATTERN = /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/

function isValidName(value: string) {
  return NAME_PATTERN.test(value)
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-öø-ÿ])/g, (_match, sep, char) => sep + char.toUpperCase())
}

export async function submitStudent(
  _prevState: SubmitStudentState,
  formData: FormData
): Promise<SubmitStudentState> {
  const values: Record<string, string> = {}
  for (const key of allFieldKeys) {
    values[key] = ((formData.get(key) as string) ?? '').trim()
  }

  const fieldErrors: Record<string, string> = {}

  for (const [key, label] of Object.entries(requiredFields)) {
    if (!values[key]) fieldErrors[key] = `${label} is required.`
  }

  for (const key of nameFields) {
    const value = values[key]
    if (value && !isValidName(value)) {
      fieldErrors[key] = 'Only letters, spaces, hyphens, and apostrophes are allowed.'
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.', values }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, middle_name, last_name, email, phone_number, date_of_birth, relationship_to_student')
    .eq('id', user.id)
    .single()

  if (!profile?.phone_number || !profile?.date_of_birth || !profile?.relationship_to_student) {
    return {
      error:
        'Your profile is missing some required information (phone number, date of birth, or relationship to student). Please complete My Profile first.',
      values,
    }
  }

  if (values.student_dob && !fieldErrors.student_dob) {
    const studentDob = new Date(values.student_dob)
    const minDob = new Date()
    minDob.setFullYear(minDob.getFullYear() - 2)
    if (studentDob > minDob) {
      fieldErrors.student_dob = 'Student must be at least 2 years old.'
    }

    const minParentDob = new Date(studentDob)
    minParentDob.setFullYear(minParentDob.getFullYear() - 10)
    if (new Date(profile.date_of_birth) > minParentDob) {
      fieldErrors.student_dob =
        'This date of birth would make you less than 10 years older than the student. Please check the date.'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Please fix the highlighted fields below.', fieldErrors, values }
  }

  // Still goes through the normal admin review queue (status pending_review,
  // no created_parent_id yet) rather than auto-approving — Enroll A Student
  // on the admin side already knows how to match an existing parent by
  // email and reuse the account without creating a duplicate or sending a
  // new welcome email, so this reuses that same path rather than a special
  // "already logged in" bypass.
  const { error } = await supabase.from('applications').insert({
    student_first_name: toTitleCase(values.student_first_name),
    student_middle_name: values.student_middle_name ? toTitleCase(values.student_middle_name) : null,
    student_last_name: toTitleCase(values.student_last_name),
    student_dob: values.student_dob,
    student_gender: values.student_gender,
    parent_first_name: profile.first_name,
    parent_middle_name: profile.middle_name,
    parent_last_name: profile.last_name,
    parent_dob: profile.date_of_birth,
    parent_relationship: profile.relationship_to_student,
    parent_contact_number: profile.phone_number,
    parent_email: profile.email,
  })

  if (error) {
    return { error: error.message, values }
  }

  redirect('/parent/enroll-a-student?submitted=true')
}
