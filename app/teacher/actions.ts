'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

export async function postAnnouncement(input: { title: string; body: string; classroomId?: string | null }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your session has expired. Please log in again.')
  }
  if (!input.title.trim() || !input.body.trim()) {
    throw new Error('Add both a title and a message.')
  }

  const { error } = await supabase.from('announcements').insert({
    title: input.title.trim(),
    body: input.body.trim(),
    posted_by: user.id,
    // Classroom announcements posted from the teacher dashboard are for
    // parents specifically — admin has its own broader announcement tool.
    target_role: 'parent',
    // Null means unscoped — visible to every parent, same as before this
    // existed. A set classroom_id only reaches a parent with a child
    // actually in that classroom (see lib/parent-classrooms.ts).
    classroom_id: input.classroomId || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Posted classroom announcement',
    targetTable: 'announcements',
  })

  revalidatePath('/teacher')
  revalidatePath('/parent/announcement')
}
