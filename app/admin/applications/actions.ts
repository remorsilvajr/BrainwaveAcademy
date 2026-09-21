'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { documentShortLabels, validateCorrectionNotes } from '@/lib/documents'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'
import { requireAdmin } from '@/lib/require-admin'
import { applyClassroomToStudent } from '@/lib/classroom-assignment'
import { validateProgramOptionsForClassroom } from '@/lib/program-options'
import { notifyUsers } from '@/lib/notify'
import { documentCorrectionEmail } from '@/lib/notification-emails'

type DocumentStatuses = Record<string, 'valid' | 'needs_correction' | 'pending'>
// What the admin wrote for each document marked needs_correction, keyed by document type.
type CorrectionNotes = Record<string, string>

// Saves the review: each document's status, the note the parent will see for a document that
// needs correcting (cleared when it no longer does), and the internal notes. Returns
// `{ error }` instead of throwing (a thrown Server Function error is redacted in a
// production build).
export async function saveDocumentReview(
  applicationId: string,
  documentStatuses: DocumentStatuses,
  notes: string,
  correctionNotes: CorrectionNotes = {}
): Promise<{ error: string } | undefined> {
  const invalid = validateCorrectionNotes(documentStatuses, correctionNotes, false)
  if (invalid) return { error: invalid }

  const supabase = await createClient()

  for (const [documentType, status] of Object.entries(documentStatuses)) {
    const note = status === 'needs_correction' ? (correctionNotes[documentType] ?? '').trim() : ''
    const { error } = await supabase
      .from('application_documents')
      .update({ verification_status: status, correction_note: note || null })
      .eq('application_id', applicationId)
      .eq('document_type', documentType)
    if (error) return { error: error.message }
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

// Asks the parent to re-upload the documents marked needs_correction. Every one needs a note
// saying what is wrong with it; the parent gets an email listing each document with its
// note, an in-portal notification, and sees the note next to the document on Requirements.
export async function requestCorrections(
  applicationId: string,
  documentStatuses: DocumentStatuses,
  notes: string,
  correctionNotes: CorrectionNotes = {}
): Promise<{ error: string } | undefined> {
  const invalid = validateCorrectionNotes(documentStatuses, correctionNotes, true)
  if (invalid) return { error: invalid }

  const saved = await saveDocumentReview(applicationId, documentStatuses, notes, correctionNotes)
  if (saved?.error) return saved

  const items = Object.entries(documentStatuses)
    .filter(([, status]) => status === 'needs_correction')
    .map(([type]) => ({ label: documentShortLabels[type] ?? type, note: (correctionNotes[type] ?? '').trim() }))

  if (items.length > 0) {
    const supabase = await createClient()
    const { data: application } = await supabase
      .from('applications')
      .select('id, created_parent_id, parent_email, parent_first_name, student_first_name, student_last_name')
      .eq('id', applicationId)
      .single()

    if (application?.created_parent_id) {
      // In-portal notice (bell + the Requirements badge grows by one per document);
      // the email below still goes out.
      await notifyUsers([application.created_parent_id], {
        kind: 'request',
        title: 'Corrections needed on documents',
        body: `${application.student_first_name} ${application.student_last_name}: ${items.map((i) => `${i.label} (${i.note})`).join('; ')}`.slice(0, 200),
        href: `/parent/requirements?student=${application.id}`,
      })
    }

    if (application) {
      // Best-effort: the review is already saved, so a failed email shouldn't fail it.
      try {
        const mail = documentCorrectionEmail({
          parentFirstName: application.parent_first_name,
          studentName: `${application.student_first_name} ${application.student_last_name}`,
          items,
          siteUrl: getSiteUrl(),
        })
        await sendEmail({ to: application.parent_email, subject: mail.subject, html: mail.html })
      } catch (err) {
        console.error('sendEmail failed for requestCorrections:', err)
      }
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
// once the parent account exists (from Enrollment Requests) AND every document
// is marked valid. Every step's error is checked and surfaced; a previous
// version of this insert-chain (when it lived in enroll-a-student/actions.ts)
// did not check the parent_student insert for errors, which could fail
// silently and leave a parent account with no visible student anywhere.
//
// Returns `{ error }` instead of throwing for every expected failure — this
// is invoked as a plain `await` call from application-review-modal.tsx, not
// through useActionState, so a thrown error's message is redacted by Next
// in a production build (surfaces as minified React error #441). See the
// note in CLAUDE.md under "Auth cookies, sessions, and RLS security model".
export async function approveAndCreateStudentRecord(
  applicationId: string,
  classroomId: string | null,
  programOptions: string[] = []
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  // Checked before anything is created: applyClassroomToStudent would reject a
  // missing/invalid option list too, but only after the student record and the
  // parent link already exist.
  if (classroomId) {
    const checked = await validateProgramOptionsForClassroom(supabase, classroomId, programOptions)
    if (!checked.ok) {
      return { error: checked.error }
    }
  }

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return { error: 'Application not found.' }
  }

  // Every request now has a parent account from the moment it is submitted, so the
  // account no longer proves it was approved: check the status itself.
  if (application.status !== 'approved') {
    return { error: 'Approve this enrollment request in Enrollment Requests first.' }
  }
  if (!application.created_parent_id) {
    return { error: 'This application has no parent account yet. Approve it via Enrollment Requests first.' }
  }

  if (application.created_student_id) {
    return { error: 'A student record already exists for this application.' }
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
    return { error: studentError?.message ?? 'Could not create the student record.' }
  }

  const { error: linkError } = await supabase.from('parent_student').insert({
    parent_id: application.created_parent_id,
    student_id: student.id,
    relationship: application.parent_relationship,
  })

  if (linkError) {
    return { error: `Student record created, but linking to the parent failed: ${linkError.message}` }
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ created_student_id: student.id })
    .eq('id', application.id)

  if (updateError) {
    return { error: updateError.message }
  }

  if (classroomId) {
    try {
      await applyClassroomToStudent(supabase, student.id, student.date_of_birth, classroomId, programOptions)
    } catch (err) {
      return {
        error: `Student record created, but the classroom couldn't be assigned: ${err instanceof Error ? err.message : 'unknown error'}. You can assign it later from the Student Record.`,
      }
    }
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
  revalidatePath('/admin/classrooms')
  revalidatePath('/admin/payments')
}

export async function getSignedDocumentUrl(path: string): Promise<{ error: string } | { url: string }> {
  // Generates a signed URL to a *private* document (birth certificate, ID,
  // proof of address...) via the service-role client below, which bypasses
  // RLS entirely and has no other check of its own — without this, any
  // caller who could guess or obtain a storage path (see
  // lib/require-admin.ts) could read any family's private documents.
  await requireAdmin()

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('documents').createSignedUrl(path, 60 * 5)

  if (error || !data) {
    return { error: error?.message ?? 'Could not generate a document link.' }
  }

  return { url: data.signedUrl }
}
