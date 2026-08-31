'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { documentShortLabels } from '@/lib/documents'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'

type DocumentStatuses = Record<string, 'valid' | 'needs_correction' | 'pending'>

export async function saveDocumentReview(
  applicationId: string,
  documentStatuses: DocumentStatuses,
  notes: string
) {
  const supabase = await createClient()

  for (const [documentType, status] of Object.entries(documentStatuses)) {
    await supabase
      .from('application_documents')
      .update({ verification_status: status })
      .eq('application_id', applicationId)
      .eq('document_type', documentType)
  }

  await supabase.from('applications').update({ review_notes: notes }).eq('id', applicationId)

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Reviewed application documents',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/applications')
  revalidatePath('/parent/requirements')
}

export async function requestCorrections(
  applicationId: string,
  documentStatuses: DocumentStatuses,
  notes: string
) {
  await saveDocumentReview(applicationId, documentStatuses, notes)

  const needsCorrection = Object.entries(documentStatuses)
    .filter(([, status]) => status === 'needs_correction')
    .map(([type]) => documentShortLabels[type] ?? type)

  if (needsCorrection.length > 0) {
    const supabase = await createClient()
    const { data: application } = await supabase
      .from('applications')
      .select('parent_email, parent_first_name, student_first_name, student_last_name')
      .eq('id', applicationId)
      .single()

    if (application) {
      const siteUrl = getSiteUrl()
      await sendEmail({
        to: application.parent_email,
        subject: `Action needed: documents for ${application.student_first_name} ${application.student_last_name}`,
        html: `
          <p>Hi ${application.parent_first_name},</p>
          <p>A few documents for ${application.student_first_name} ${application.student_last_name}'s enrollment need to be resubmitted:</p>
          <ul>${needsCorrection.map((label) => `<li>${label}</li>`).join('')}</ul>
          <p>Please log in to the Parent Portal and visit Requirements to upload corrected copies.</p>
          <p><a href="${siteUrl}/login">Log in to the Parent Portal</a></p>
        `,
      })
    }
  }

  const supabaseForLog = await createClient()
  const {
    data: { user: actingAdmin },
  } = await supabaseForLog.auth.getUser()
  await logActivity(supabaseForLog, {
    actorId: actingAdmin?.id ?? null,
    action: 'Requested application corrections',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/applications')
  revalidatePath('/parent/requirements')
}

// The actual point where a student record gets created — only reachable
// once the parent account exists (from Enroll A Student) AND every document
// is marked valid. Every step's error is checked and surfaced; a previous
// version of this insert-chain (when it lived in enroll-a-student/actions.ts)
// did not check the parent_student insert for errors, which could fail
// silently and leave a parent account with no visible student anywhere.
export async function approveAndCreateStudentRecord(applicationId: string) {
  const supabase = await createClient()

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    throw new Error('Application not found.')
  }

  if (!application.created_parent_id) {
    throw new Error(
      'This application has no parent account yet — approve it via Enroll A Student first.'
    )
  }

  if (application.created_student_id) {
    throw new Error('A student record already exists for this application.')
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      application_id: application.id,
      first_name: application.student_first_name,
      middle_name: application.student_middle_name,
      last_name: application.student_last_name,
      date_of_birth: application.student_dob,
      gender: application.student_gender,
      enrollment_status: 'active',
    })
    .select()
    .single()

  if (studentError || !student) {
    throw new Error(studentError?.message ?? 'Could not create the student record.')
  }

  const { error: linkError } = await supabase.from('parent_student').insert({
    parent_id: application.created_parent_id,
    student_id: student.id,
    relationship: application.parent_relationship,
  })

  if (linkError) {
    throw new Error(`Student record created, but linking to the parent failed: ${linkError.message}`)
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ created_student_id: student.id })
    .eq('id', application.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Approved application & created student record for ${application.student_first_name} ${application.student_last_name}`,
    targetTable: 'students',
    targetId: student.id,
  })

  revalidatePath('/admin/applications')
  revalidatePath('/admin/students')
  revalidatePath('/admin/enroll-a-student')

  return student
}

export async function getSignedDocumentUrl(path: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('documents').createSignedUrl(path, 60 * 5)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not generate a document link.')
  }

  return data.signedUrl
}
