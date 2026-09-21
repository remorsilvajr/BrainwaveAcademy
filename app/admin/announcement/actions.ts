'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { notifyClassroomParents, notifyRole } from '@/lib/notify'

const TARGET_ROLES = ['parent', 'teacher', 'all'] as const

export async function postAnnouncement(input: {
  title: string
  body: string
  target_role: string
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
  if (!(TARGET_ROLES as readonly string[]).includes(input.target_role)) {
    return { error: 'Invalid target audience.' }
  }

  const { data: posted, error } = await supabase
    .from('announcements')
    .insert({
    title: input.title.trim(),
    body: input.body.trim(),
    posted_by: user.id,
    target_role: input.target_role,
    // Only meaningful for a parent-visible announcement — see
    // lib/parent-classrooms.ts. Harmless to set on a teacher-only one, it
    // just has no effect since classroom scoping only restricts parents.
    classroom_id: input.classroomId || null,
    })
    .select('id')
    .single()

  if (error || !posted) {
    return { error: error?.message ?? 'Could not post the announcement.' }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Posted announcement (${input.target_role})`,
    targetTable: 'announcements',
  })

  // Tell the people it is for (bell + the sidebar badge on Announcement). A scoped
  // announcement reaches only that class's parents, like the announcement itself.
  const heading = `New announcement: ${input.title.trim()}`.slice(0, 120)
  const preview = input.body.trim().slice(0, 140)
  if (input.target_role === 'parent' || input.target_role === 'all') {
    const forParents = { kind: 'message', title: heading, body: preview, href: '/parent/announcement', dedupeKey: `announcement:${posted.id}` }
    if (input.classroomId) await notifyClassroomParents(input.classroomId, forParents)
    else await notifyRole('parent', forParents)
  }
  if (input.target_role === 'teacher' || input.target_role === 'all') {
    await notifyRole('teacher', { kind: 'message', title: heading, body: preview, href: '/teacher/announcement', dedupeKey: `announcement:${posted.id}` })
  }

  revalidatePath('/admin/announcement')
  revalidatePath('/parent')
  revalidatePath('/parent/announcement')
  revalidatePath('/teacher')
  revalidatePath('/teacher/announcement')
}

export async function deleteAnnouncement(id: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Deleted announcement',
    targetTable: 'announcements',
    targetId: id,
  })

  revalidatePath('/admin/announcement')
  revalidatePath('/parent')
  revalidatePath('/parent/announcement')
  revalidatePath('/teacher')
  revalidatePath('/teacher/announcement')
}
