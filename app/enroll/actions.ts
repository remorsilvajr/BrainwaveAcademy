'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateProgramOptions } from '@/lib/program-options'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { isValidEmail, EMAIL_VALIDATION_MESSAGE, normalizeEmail } from '@/lib/email-validation'
import { notifyAdmins } from '@/lib/notify'
import { genderFromParentRelationship } from '@/lib/gender'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { logActivity } from '@/lib/activity-log'
import { isPasswordBreached, validateNewPassword } from '@/lib/password'
import { formErrorBanner } from '@/lib/form-errors'
import { createParentWithApplication } from '@/lib/parent-signup'
import { setRememberMeCookie, setSessionMarkerCookies } from '@/lib/auth-cookies'

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
  requested_classroom_id: 'Program selection',
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
    redirect('/enroll/thank-you')
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

  if (values.parent_email && !isValidEmail(values.parent_email)) {
    fieldErrors.parent_email = EMAIL_VALIDATION_MESSAGE
  }

  if (values.parent_contact_number && !isValidPhilippineMobile(values.parent_contact_number)) {
    fieldErrors.parent_contact_number =
      'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'
  }

  if (values.student_dob && !fieldErrors.student_dob) {
    if (!isValidDob(values.student_dob, { minAge: MIN_STUDENT_AGE, maxAge: MAX_STUDENT_AGE })) {
      fieldErrors.student_dob = dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_STUDENT_AGE)
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

  // The Program step's disabled cards are UX only — this app's own
  // pen-testing convention requires the real boundary to be server-side, so
  // re-check the requested classroom actually exists and is still
  // age-eligible for the given DOB before trusting it.
  // Named options inside a Tutorial / Quiz Bee style program. The checkboxes are
  // UX only, so they're re-validated against the program's fixed list here.
  let programOptions: string[] = []
  if (values.requested_classroom_id && values.student_dob && !fieldErrors.student_dob) {
    const supabaseForClassroomCheck = await createClient()
    const { data: requestedClassroom } = await supabaseForClassroomCheck
      .from('classrooms')
      .select('id, slug, min_age_years, max_age_years')
      .eq('id', values.requested_classroom_id)
      .maybeSingle()

    if (!requestedClassroom) {
      fieldErrors.requested_classroom_id = 'Please select a valid program.'
    } else if (!isAgeEligibleForClassroom(values.student_dob, requestedClassroom)) {
      fieldErrors.requested_classroom_id = "The selected program isn't available for this student's age."
    } else {
      const checked = validateProgramOptions(
        requestedClassroom.slug,
        formData.getAll('requested_program_options').filter((v): v is string => typeof v === 'string')
      )
      if (checked.ok) programOptions = checked.options
      else fieldErrors.requested_program_options = checked.error
    }
  }

  // The password the parent typed twice. It is read straight from the form and
  // never put in `values` (which is echoed back to the browser), logged or stored
  // by this app: it goes to Supabase Auth, which keeps only a bcrypt hash. The
  // network lookup for breached passwords is skipped while other fields are still
  // wrong, so a form with several mistakes doesn't wait on it.
  const password = (formData.get('password') as string) ?? ''
  const confirmPassword = (formData.get('confirm_password') as string) ?? ''
  const otherErrors = Object.keys(fieldErrors).length > 0
  const passwordProblem = await validateNewPassword(
    password,
    confirmPassword,
    { email: values.parent_email, names: [values.parent_first_name, values.parent_last_name] },
    (candidate) => (otherErrors ? Promise.resolve(null) : isPasswordBreached(candidate))
  )
  if (passwordProblem) {
    if (!password) fieldErrors.password = 'Password is required.'
    else if (password !== confirmPassword) fieldErrors.confirm_password = passwordProblem
    else fieldErrors.password = passwordProblem
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: formErrorBanner(fieldErrors),
      fieldErrors,
      values,
    }
  }

  // Creates the parent's account with the password they chose, a wallet, and their
  // first enrollment request (linked to that account from the start). Uses the
  // service-role client because this runs for an anonymous visitor. An email that
  // already has an account, or that is on an older request with no account, is
  // refused inside (see lib/parent-signup.ts).
  const admin = createAdminClient()
  const email = normalizeEmail(values.parent_email)
  const created = await createParentWithApplication(admin, {
    email,
    password,
    profile: {
      first_name: toTitleCase(values.parent_first_name),
      middle_name: values.parent_middle_name ? toTitleCase(values.parent_middle_name) : null,
      last_name: toTitleCase(values.parent_last_name),
      phone_number: normalizePhilippineMobile(values.parent_contact_number),
      date_of_birth: values.parent_dob,
      relationship_to_student: values.parent_relationship,
      gender: genderFromParentRelationship(values.parent_relationship, values.parent_gender),
    },
    application: {
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
      requested_classroom_id: values.requested_classroom_id || null,
      requested_program_options: programOptions,
    },
  })

  if (!created.ok) {
    return {
      error: created.error,
      fieldErrors:
        created.field === 'email'
          ? { parent_email: created.error }
          : created.field === 'password'
            ? { password: created.error }
            : undefined,
      values,
    }
  }

  // Sign them in right away so they land in their portal (same cookies as login()).
  // remember_me must be set before signInWithPassword so the session cookies get
  // the right lifetime. If sign-in somehow fails the account still exists, so send
  // them to the login page rather than showing an error for a form that succeeded.
  const cookieStore = await cookies()
  setRememberMeCookie(cookieStore, true)
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    redirect(`/login?message=${encodeURIComponent('Your account was created. Please log in.')}`)
  }
  setSessionMarkerCookies(cookieStore, 'parent', 'active')

  await logActivity(supabase, {
    actorId: created.userId,
    action: `New enrollment application submitted (public site) for ${values.student_first_name} ${values.student_last_name}`,
    targetTable: 'applications',
    targetId: created.applicationId,
  })

  await notifyAdmins({
    kind: 'request',
    title: 'New enrollment request',
    body: `${values.student_first_name} ${values.student_last_name} was submitted for review.`,
    href: '/admin/enroll-a-student',
  })

  redirect('/parent/enrollment-status?welcome=1')
}
