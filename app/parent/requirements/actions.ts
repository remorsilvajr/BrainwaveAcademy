'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadRequirementDocument(
  applicationId: string,
  documentType: string,
  formData: FormData
) {
  const supabase = await createClient()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose a file to upload.')
  }

  const extension = file.name.split('.').pop() || 'bin'
  const path = `${applicationId}/${documentType}.${extension}`

  // RLS (parents_insert/update_own_documents) enforces that this parent
  // actually owns a student tied to applicationId — no manual ownership
  // check needed here, the database rejects it otherwise.
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: upsertError } = await supabase.from('application_documents').upsert(
    {
      application_id: applicationId,
      document_type: documentType,
      file_url: path,
      verification_status: 'pending',
    },
    { onConflict: 'application_id,document_type' }
  )

  if (upsertError) {
    throw new Error(upsertError.message)
  }

  revalidatePath('/parent/requirements')
}

// Verifies ownership via a normal RLS-scoped select (only succeeds if this
// document belongs to one of the caller's own linked children) before using
// the service role client purely to generate the signed URL.
export async function getOwnDocumentSignedUrl(documentId: string) {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('application_documents')
    .select('file_url')
    .eq('id', documentId)
    .single()

  if (error || !doc) {
    throw new Error('Document not found or access denied.')
  }

  const admin = createAdminClient()
  const { data, error: signError } = await admin.storage
    .from('documents')
    .createSignedUrl(doc.file_url, 60 * 5)

  if (signError || !data) {
    throw new Error(signError?.message ?? 'Could not generate a document link.')
  }

  return data.signedUrl
}
