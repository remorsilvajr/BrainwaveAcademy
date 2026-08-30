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

  // RLS (parents_upload_own_documents/parents_replace_own_documents on
  // storage.objects) enforces that this parent actually owns the
  // application tied to applicationId, via applications.created_parent_id —
  // no manual ownership check needed here, the database rejects it otherwise.
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

  // The 2x2 ID photo doubles as the student's profile picture wherever
  // there's already a real student record for this application (documents
  // are uploaded well before that's guaranteed to exist — see the
  // application_documents RLS note in CLAUDE.md). 'documents' is a private
  // bucket, so the photo is re-uploaded into the public 'avatars' bucket
  // rather than pointing avatar_url at a signed-URL-only path.
  if (documentType === 'id_photo') {
    const { data: application } = await supabase
      .from('applications')
      .select('created_student_id')
      .eq('id', applicationId)
      .single()

    if (application?.created_student_id) {
      const avatarPath = `student-${application.created_student_id}/avatar.${extension}`
      const { error: avatarUploadError } = await supabase.storage
        .from('avatars')
        .upload(avatarPath, file, { upsert: true })

      if (!avatarUploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
        await supabase
          .from('students')
          .update({ avatar_url: `${publicUrlData.publicUrl}?v=${Date.now()}` })
          .eq('id', application.created_student_id)
      }
    }
  }

  revalidatePath('/parent/requirements')
  revalidatePath('/parent/students')
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
