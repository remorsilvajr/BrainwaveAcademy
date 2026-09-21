'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { notifyClassroomParents, notifyRole } from '@/lib/notify'

export async function postAnnouncement(input: {
  title: string
  body: string
  classroomId?: string | null
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }
  if (!input.title.trim() || !input.body.trim()) {
    return { error: 'Add both a title and a message.' }
  }

  // A teacher may only target a classroom they're actually lead or
  // assistant of — the dropdown already only offers those, but this is the
  // real enforcement, since a Server Action is reachable directly
  // regardless of what the UI offers (see the Middleware/Server Action
  // note in CLAUDE.md). Unscoped (no classroomId) is always allowed.
  if (input.classroomId) {
    const [{ data: classroom }, { data: assistantLink }] = await Promise.all([
      supabase.from('classrooms').select('id, lead_teacher_id').eq('id', input.classroomId).maybeSingle(),
      supabase
        .from('classroom_assistants')
        .select('classroom_id')
        .eq('classroom_id', input.classroomId)
        .eq('teacher_id', user.id)
        .maybeSingle(),
    ])
    if (!classroom) {
      return { error: 'Classroom not found.' }
    }
    const isAssigned = classroom.lead_teacher_id === user.id || !!assistantLink
    if (!isAssigned) {
      return { error: 'You can only post to a classroom you are assigned to as a lead or assistant teacher.' }
    }
  }

  const { data: posted, error } = await supabase
    .from('announcements')
    .insert({
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
    .select('id')
    .single()

  if (error || !posted) {
    return { error: error?.message ?? 'Could not post the announcement.' }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Posted classroom announcement',
    targetTable: 'announcements',
  })

  const forParents = {
    kind: 'message',
    title: `New announcement: ${input.title.trim()}`.slice(0, 120),
    body: input.body.trim().slice(0, 140),
    href: '/parent/announcement',
    dedupeKey: `announcement:${posted.id}`,
  }
  if (input.classroomId) await notifyClassroomParents(input.classroomId, forParents)
  else await notifyRole('parent', forParents)

  revalidatePath('/teacher')
  revalidatePath('/parent/announcement')
}
