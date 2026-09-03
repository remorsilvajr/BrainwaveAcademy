'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { genderFromParentRelationship } from '@/lib/gender'
import { logActivity } from '@/lib/activity-log'

export type SubmitApplicationState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const requiredFields: Record<string, string> = {
  student_first_name: 'Student first name',
  student_last_name: 'Student last name',
  student_dob: "Student's date of birth",
  student_gender: 'Student gender',
  parent_first_name: 'Parent first name',
  parent_last_name: 'Parent last name',
  parent_dob: "Parent's date of birth",
  parent_relationship: 'Relationship',
  parent_contact_number: 'Contact number',
  parent_email: 'Email address',
}

const allFieldKeys = [...Object.keys(requiredFields), 'student_middle_name', 'parent_middle_name', 'parent_gender']

const nameFields = [
  'student_first_name',
  'student_middle_name',
  'student_last_name',
  'parent_first_name',
  'parent_middle_name',
  'parent_last_name',
]

export async function submitApplication(
  _prevState: SubmitApplicationState,
  formData: FormData
): Promise<SubmitApplicationState> {
  // Honeypot (see the "website" field in enrollment-form.tsx) — invisible
  // to a real visitor, but a generic bot commonly fills every field it
  // finds. Redirect as if it succeeded rather than surfacing an error, so
  // a bot gets no signal to adapt to; nothing is actually written.
  if (((formData.get('website') as string) ?? '').trim() !== '') {
    redirect('/enroll?submitted=true')
  }

  const values: Record<string, string> = {}
  for (const key of allFieldKeys) {
    values[key] = ((formData.get(key) as string) ?? '').trim()
  }

  const fieldErrors: Record<string, string> = {}

  for (const [key, label] of Object.entries(requiredFields)) {
    if (!values[key]) {
      fieldErrors[key] = `${label} is required.`
    }
  }

  for (const key of nameFields) {
    const value = values[key]
    if (value && !isValidName(value)) {
      fieldErrors[key] = NAME_VALIDATION_MESSAGE
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (values.parent_email && !emailPattern.test(values.parent_email)) {
    fieldErrors.parent_email = 'Please enter a valid email address.'
  }

  if (values.parent_contact_number && !isValidPhilippineMobile(values.parent_contact_number)) {
    fieldErrors.parent_contact_number =
      'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'
  }

  if (values.student_dob && !fieldErrors.student_dob) {
    if (!isValidDob(values.student_dob, { minAge: MIN_STUDENT_AGE, maxAge: MAX_AGE })) {
      fieldErrors.student_dob = dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_AGE)
    }
  }

  if (values.parent_dob && !fieldErrors.parent_dob) {
    if (!isValidDob(values.parent_dob, { minAge: MIN_ADULT_AGE, maxAge: MAX_AGE })) {
      fieldErrors.parent_dob = dobRangeMessage('Parent', MIN_ADULT_AGE, MAX_AGE)
    }
  }

  if (values.student_dob && values.parent_dob && !fieldErrors.student_dob && !fieldErrors.parent_dob) {
    const studentDob = new Date(values.student_dob)
    const parentDob = new Date(values.parent_dob)
    const minParentDob = new Date(studentDob)
    minParentDob.setFullYear(minParentDob.getFullYear() - 10)
    if (parentDob > minParentDob) {
      fieldErrors.parent_dob =
        "Parent must be at least 10 years older than the student. Please check the date of birth."
    }
  }

  // Client-side `required` alone isn't sufficient — this project's own
  // pen-testing convention (see CLAUDE.md) is that anything reaching the
  // database gets validated server-side too, and this checkbox is what
  // actually records that the applicant consented to the Privacy
  // Policy/Terms before we process their (and their child's) personal
  // information.
  if (formData.get('agreed_to_policies') !== 'on') {
    fieldErrors.agreed_to_policies = 'Please review and agree to the Privacy Policy and Terms of Service to continue.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Please fix the highlighted fields below.',
      fieldErrors,
      values,
    }
  }

  // This public form is for brand-new parents only — an existing parent
  // enrolling another child should do it logged in, via Enroll A Student in
  // their portal, not resubmit this form (which would otherwise silently
  // reuse their account with no new email sent, per approveApplication's
  // own duplicate-email handling — confusing here since nothing in this
  // form's own confirmation message reflects that).
  //
  // Uses the admin client because this check has to run for anonymous
  // visitors, and `profiles` has no RLS policy letting `anon` read it —
  // regular anon inserts into `applications` stay on the normal RLS-scoped
  // client below.
  const admin = createAdminClient()
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', values.parent_email.toLowerCase())
    .maybeSingle()

  if (existingProfile) {
    return {
      error:
        'An account already exists with this email. Please log in and use Enroll A Student in your portal to add another child.',
      values,
    }
  }

  const supabase = await createClient()

  // No .select() chained onto this insert — anon has no SELECT policy on
  // applications (parent_view_own_applications requires auth.uid()), so
  // asking PostgREST to return the inserted row would fail the whole
  // request even though the insert itself succeeded.
  const { error } = await supabase.from('applications').insert({
    student_first_name: toTitleCase(values.student_first_name),
    student_middle_name: values.student_middle_name ? toTitleCase(values.student_middle_name) : null,
    student_last_name: toTitleCase(values.student_last_name),
    student_dob: values.student_dob,
    student_gender: values.student_gender,
    parent_first_name: toTitleCase(values.parent_first_name),
    parent_middle_name: values.parent_middle_name ? toTitleCase(values.parent_middle_name) : null,
    parent_last_name: toTitleCase(values.parent_last_name),
    parent_dob: values.parent_dob,
    parent_relationship: values.parent_relationship,
    parent_gender: genderFromParentRelationship(values.parent_relationship, values.parent_gender),
    parent_contact_number: normalizePhilippineMobile(values.parent_contact_number),
    parent_email: values.parent_email.toLowerCase(),
  })

  if (error) {
    return {
      error: 'Something went wrong submitting your application. Please try again.',
      values,
    }
  }

  // actorId is null — this is the public, unauthenticated enrollment form.
  await logActivity(supabase, {
    actorId: null,
    action: `New enrollment application submitted (public site) for ${values.student_first_name} ${values.student_last_name}`,
    targetTable: 'applications',
  })

  redirect('/enroll?submitted=true')
}
