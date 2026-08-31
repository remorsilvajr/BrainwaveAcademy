'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

export async function resolveFeedback(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('feedback').update({ resolved: true }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Resolved feedback',
    targetTable: 'feedback',
    targetId: id,
  })

  revalidatePath('/admin')
}
