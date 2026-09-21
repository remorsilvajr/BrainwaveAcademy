'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { feedbackCategoryOrder } from '@/lib/feedback'
import { notifyAdmins } from '@/lib/notify'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // matches the bug-reports bucket's own file_size_limit

// Shared across all three roles — the trigger lives in ProfileMenu, which
// renders on the landing header (once logged in) and every portal top bar,
// so this isn't colocated with any one route the way most actions.ts files
// in this app are. `feedback.submitted_by` is RLS-scoped to auth.uid() via
// `users_insert_own_feedback`, so this runs on the regular request-scoped
// client, not createAdminClient(). That policy's WITH CHECK also locks
// `resolved`/`admin_response`/`responded_by`/`responded_at` to their
// defaults at insert time — this action never sets them either, so the two
// stay in sync by construction rather than by remembering to match a policy.
export async function submitFeedback(
  subject: string,
  message: string,
  category: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const trimmedSubject = subject.trim()
  const trimmedMessage = message.trim()
  if (!trimmedSubject) {
    return { error: 'Please add a short subject.' }
  }
  if (!trimmedMessage) {
    return { error: 'Please describe the issue.' }
  }
  if (!feedbackCategoryOrder.includes(category)) {
    return { error: 'Please choose a valid category.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to send a bug report.' }
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
      return { error: 'Screenshot must be under 5MB.' }
    }
    if (!image.type.startsWith('image/')) {
      return { error: 'Please attach an image file.' }
    }
    const extension = image.name.split('.').pop() || 'png'
    imagePath = `${user.id}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('bug-reports').upload(imagePath, image)
    if (uploadError) {
      return { error: uploadError.message }
    }
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      submitted_by: user.id,
      subject: trimmedSubject,
      message: trimmedMessage,
      image_path: imagePath,
      category,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: category === 'bug' ? 'Submitted a bug report' : 'Submitted feedback',
    targetTable: 'feedback',
    targetId: data.id,
  })

  await notifyAdmins({
    kind: 'message',
    title: category === 'bug' ? 'New bug report' : 'New feedback',
    body: trimmedSubject,
    href: `/admin/feedback?open=${data.id}`,
    dedupeKey: `feedback:${data.id}`,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}

export type MyFeedbackItem = {
  id: string
  subject: string
  message: string
  category: string
  resolved: boolean
  admin_response: string | null
  responded_at: string | null
  created_at: string
}

// Own-history view for the submitter — `users_view_own_feedback` RLS scopes
// this to the caller's own rows, so no extra ownership filter is needed
// here beyond auth.uid() already being who the row is scoped to.
export async function getMyFeedback(): Promise<{ error: string } | { items: MyFeedbackItem[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to view your feedback.' }
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('id, subject, message, category, resolved, admin_response, responded_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { items: data ?? [] }
}
