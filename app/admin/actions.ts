'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { feedbackCategoryOrder } from '@/lib/feedback'

export async function resolveFeedback(id: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('feedback').update({ resolved: true }).eq('id', id)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Resolved feedback',
    targetTable: 'feedback',
    targetId: id,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}

export async function reopenFeedback(id: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('feedback').update({ resolved: false }).eq('id', id)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Reopened feedback',
    targetTable: 'feedback',
    targetId: id,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}

// Categorizing and replying are one action, not two — in practice admin
// does both in the same pass while triaging a feedback item. Setting
// `resolved: true` here too means "respond" is the normal way an item gets
// closed out; the separate resolve/reopen toggles above stay for a case
// where admin wants to mark something done with no reply text at all.
export async function respondToFeedback(
  id: string,
  category: string,
  response: string
): Promise<{ error: string } | undefined> {
  if (!feedbackCategoryOrder.includes(category)) {
    return { error: 'Please choose a valid category.' }
  }
  const trimmedResponse = response.trim()
  if (!trimmedResponse) {
    return { error: 'Enter a response before sending.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('feedback')
    .update({
      category,
      admin_response: trimmedResponse,
      responded_by: user?.id ?? null,
      responded_at: new Date().toISOString(),
      resolved: true,
    })
    .eq('id', id)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Responded to feedback',
    targetTable: 'feedback',
    targetId: id,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}
