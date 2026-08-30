'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
}

export async function requestCorrections(
  applicationId: string,
  documentStatuses: DocumentStatuses,
  notes: string
) {
  await saveDocumentReview(applicationId, documentStatuses, notes)

  const supabase = await createClient()
  await supabase
    .from('applications')
    .update({ status: 'needs_correction', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId)

  revalidatePath('/admin/applications')
}

// Documents live in a private Storage bucket, so viewing one means
// generating a short-lived signed URL server-side with the service role
// key, rather than exposing a public read policy on sensitive files
// (birth certificates, government IDs).
export async function getSignedDocumentUrl(path: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('documents').createSignedUrl(path, 60 * 5)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not generate a document link.')
  }

  return data.signedUrl
}
