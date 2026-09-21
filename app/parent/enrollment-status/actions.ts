'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { notifyAdmins } from '@/lib/notify'
import { validateProgramOptions } from '@/lib/program-options'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { genderFromParentRelationship } from '@/lib/gender'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'

// RLS (parents_hide_own_rejected_applications) enforces both ownership and
// status = 'rejected' — same "trust RLS, don't duplicate the check here"
// pattern as updateStudentAvatar in app/parent/students/actions.ts. That
// policy checks parent_email rather than created_parent_id specifically
// because a rejected application never gets created_parent_id set (see the
// Requirements selectedElsewhereStatus note in CLAUDE.md) — auth_email()
// (a SECURITY DEFINER helper mirroring auth_role()) resolves the caller's
// own email for that comparison.
//
// This only ever sets hidden_from_parent — it never deletes the row or
// touches anything admin can see. See enrollment-requests-table.tsx for
// the admin-side "archive" equivalent, which is a separate flag entirely.
export async function hideRejectedApplication(applicationId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('applications')
    .update({ hidden_from_parent: true })
    .eq('id', applicationId)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!data) {
    return { error: 'This application could not be removed; it may no longer be rejected, or may not belong to your account.' }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Removed a rejected enrollment application from their portal view',
    targetTable: 'applications',
    targetId: applicationId,
  })

  // Busts the whole parent layout subtree, not just this page — the top
  // bar's own applications query (app/parent/layout.tsx) needs to drop this
  // row too, or the "removed" child would still show up in the selector.
  revalidatePath('/parent', 'layout')
}

export type ResubmitState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const resubmitRequired: Record<string, string> = {
  student_first_name: 'Student first name',
  student_last_name: 'Student last name',
  student_dob: "Student's date of birth",
  student_gender: 'Student gender',
  parent_first_name: 'Guardian first name',
  parent_last_name: 'Guardian last name',
  parent_dob: "Guardian's date of birth",
  parent_relationship: 'Relationship',
  parent_contact_number: 'Contact number',
  requested_classroom_id: 'Program selection',
}
const resubmitKeys = [...Object.keys(resubmitRequired), 'student_middle_name', 'parent_middle_name', 'parent_gender']
const resubmitNameFields = ['student_first_name', 'student_middle_name', 'student_last_name', 'parent_first_name', 'parent_middle_name', 'parent_last_name']

// A parent fixing the details of their own enrollment request after the school asked for a
// correction, then sending it back for review (needs_correction -> pending_review). Same
// rules as the original form (names, phone, dates, program eligibility), re-checked here.
//
// The write goes through the parent's own client, so the database decides: the
// parents_resubmit_own_application policy allows only their own request in needs_correction
// and only into pending_review, and the applications lock trigger allows only the
// correctable columns to change. Nothing here can touch created_parent_id, the status
// history or the admin's notes. Their profile is then kept in step with the corrected
// guardian details (the account was created from them). The email address is the login and
// is not editable here.
export async function resubmitApplication(
  applicationId: string,
  _prevState: ResubmitState,
  formData: FormData
): Promise<ResubmitState> {
  const values: Record<string, string> = {}
  for (const key of resubmitKeys) values[key] = ((formData.get(key) as string) ?? '').trim()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.', values }

  const fieldErrors: Record<string, string> = {}
  for (const [key, label] of Object.entries(resubmitRequired)) {
    if (!values[key]) fieldErrors[key] = `${label} is required.`
  }
  for (const key of resubmitNameFields) {
    if (values[key] && !isValidName(values[key])) fieldErrors[key] = NAME_VALIDATION_MESSAGE
  }
  if (values.parent_contact_number && !isValidPhilippineMobile(values.parent_contact_number)) {
    fieldErrors.parent_contact_number = 'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'
  }
  if (values.student_dob && !fieldErrors.student_dob && !isValidDob(values.student_dob, { minAge: MIN_STUDENT_AGE, maxAge: MAX_STUDENT_AGE })) {
    fieldErrors.student_dob = dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_STUDENT_AGE)
  }
  if (values.parent_dob && !fieldErrors.parent_dob && !isValidDob(values.parent_dob, { minAge: MIN_ADULT_AGE, maxAge: MAX_AGE })) {
    fieldErrors.parent_dob = dobRangeMessage('Parent', MIN_ADULT_AGE, MAX_AGE)
  }
  if (values.student_dob && values.parent_dob && !fieldErrors.student_dob && !fieldErrors.parent_dob) {
    const minParentDob = new Date(values.student_dob)
    minParentDob.setFullYear(minParentDob.getFullYear() - 10)
    if (new Date(values.parent_dob) > minParentDob) {
      fieldErrors.parent_dob = 'The guardian must be at least 10 years older than the student. Please check the date of birth.'
    }
  }

  let programOptions: string[] = []
  if (values.requested_classroom_id && values.student_dob && !fieldErrors.student_dob) {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, slug, min_age_years, max_age_years')
      .eq('id', values.requested_classroom_id)
      .maybeSingle()
    if (!classroom) {
      fieldErrors.requested_classroom_id = 'Please select a valid program.'
    } else if (!isAgeEligibleForClassroom(values.student_dob, classroom)) {
      fieldErrors.requested_classroom_id = "The selected program isn't available for this student's age."
    } else {
      const checked = validateProgramOptions(
        classroom.slug,
        formData.getAll('requested_program_options').filter((v): v is string => typeof v === 'string')
      )
      if (checked.ok) programOptions = checked.options
      else fieldErrors.requested_program_options = checked.error
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Please fix the highlighted fields below.', fieldErrors, values }
  }

  const parentGender = genderFromParentRelationship(values.parent_relationship, values.parent_gender)
  const { data: updated, error } = await supabase
    .from('applications')
    .update({
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
      parent_gender: parentGender,
      parent_contact_number: normalizePhilippineMobile(values.parent_contact_number),
      requested_classroom_id: values.requested_classroom_id,
      requested_program_options: programOptions,
      status: 'pending_review',
    })
    .eq('id', applicationId)
    .select('id')
  if (error) return { error: 'Your changes could not be saved. Please try again.', values }
  if (!updated || updated.length === 0) {
    return { error: 'This request is no longer waiting for a correction.', values }
  }

  // Keep the parent's own profile in step with the corrected guardian details. Service
  // role, but only ever this caller's own row (the caller was verified above).
  await createAdminClient()
    .from('profiles')
    .update({
      first_name: toTitleCase(values.parent_first_name),
      middle_name: values.parent_middle_name ? toTitleCase(values.parent_middle_name) : null,
      last_name: toTitleCase(values.parent_last_name),
      phone_number: normalizePhilippineMobile(values.parent_contact_number),
      date_of_birth: values.parent_dob,
      relationship_to_student: values.parent_relationship,
      gender: parentGender,
    })
    .eq('id', user.id)

  const studentName = `${toTitleCase(values.student_first_name)} ${toTitleCase(values.student_last_name)}`
  await logActivity(supabase, {
    actorId: user.id,
    action: `Corrected and resubmitted the enrollment request for ${studentName}`,
    targetTable: 'applications',
    targetId: applicationId,
  })
  await notifyAdmins({
    kind: 'request',
    title: 'Enrollment request corrected',
    body: `${studentName} was updated and resubmitted for review.`,
    href: '/admin/enroll-a-student',
  })

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/parent/enrollment-status')
  redirect(`/parent/enrollment-status?student=${applicationId}&resubmitted=1`)
}
