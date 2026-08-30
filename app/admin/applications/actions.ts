'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { documentShortLabels } from '@/lib/documents'

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

  revalidatePath('/admin/applications')
  revalidatePath('/parent/requirements')
}

// Saves the review AND, if anything was marked "needs_correction", emails
// the parent listing exactly which documents need to be resubmitted.
// Does NOT touch applications.status — that field now only represents the
// enrollment decision (made via Enroll A Student), which already happened
// before any documents existed.
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
      await sendEmail({
        to: application.parent_email,
        subject: `Action needed: documents for ${application.student_first_name} ${application.student_last_name}`,
        html: `
          <p>Hi ${application.parent_first_name},</p>
          <p>A few documents for ${application.student_first_name} ${application.student_last_name}'s enrollment need to be resubmitted:</p>
          <ul>${needsCorrection.map((label) => `<li>${label}</li>`).join('')}</ul>
          <p>Please log in to the Parent Portal and visit Requirements to upload corrected copies.</p>
          <p><a href="http://localhost:3000/login">Log in to the Parent Portal</a></p>
        `,
      })
    }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/parent/requirements')
}

export async function getSignedDocumentUrl(path: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('documents').createSignedUrl(path, 60 * 5)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not generate a document link.')
  }

  return data.signedUrl
}
