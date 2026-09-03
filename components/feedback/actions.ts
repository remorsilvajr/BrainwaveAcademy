'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // matches the bug-reports bucket's own file_size_limit

// Shared across all three roles — the trigger lives in ProfileMenu, which
// renders on the landing header (once logged in) and every portal top bar,
// so this isn't colocated with any one route the way most actions.ts files
// in this app are. `feedback.submitted_by` is RLS-scoped to auth.uid() via
// the pre-existing `users_manage_own_feedback` policy, so this runs on the
// regular request-scoped client, not createAdminClient().
export async function submitFeedback(subject: string, message: string, formData: FormData) {
  const trimmedSubject = subject.trim()
  const trimmedMessage = message.trim()
  if (!trimmedSubject) {
    throw new Error('Please add a short subject.')
  }
  if (!trimmedMessage) {
    throw new Error('Please describe the issue.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to send a bug report.')
  }

  // Upload (if any) happens before the feedback row is inserted, not after
  // — so a failed upload just fails the whole submission cleanly with
  // nothing half-written, rather than leaving an orphaned feedback row with
  // no image or a row whose image_path points at nothing.
  //
  // `imagePath` is always derived here from the authenticated user's own id
  // plus a fresh server-generated UUID — the client only ever supplies raw
  // file bytes, never a path string — so there's no way for a caller to
  // reference another user's already-uploaded file by crafting a path, and
  // the bug-reports storage policy independently enforces the same
  // uid-prefixed-folder boundary on the upload itself.
  const imageEntry = formData.get('image')
  const image = imageEntry instanceof File ? imageEntry : null
  let imagePath: string | null = null
  if (image && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      throw new Error('Screenshot must be under 5MB.')
    }
    if (!image.type.startsWith('image/')) {
      throw new Error('Please attach an image file.')
    }
    const extension = image.name.split('.').pop() || 'png'
    imagePath = `${user.id}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('bug-reports').upload(imagePath, image)
    if (uploadError) {
      throw new Error(uploadError.message)
    }
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({ submitted_by: user.id, subject: trimmedSubject, message: trimmedMessage, image_path: imagePath })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Submitted a bug report',
    targetTable: 'feedback',
    targetId: data.id,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}
