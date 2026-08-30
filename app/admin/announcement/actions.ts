'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const TARGET_ROLES = ['parent', 'teacher', 'all'] as const

export async function postAnnouncement(input: { title: string; body: string; target_role: string }) {
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
  if (!(TARGET_ROLES as readonly string[]).includes(input.target_role)) {
    throw new Error('Invalid target audience.')
  }

  const { error } = await supabase.from('announcements').insert({
    title: input.title.trim(),
    body: input.body.trim(),
    posted_by: user.id,
    target_role: input.target_role,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/announcement')
  revalidatePath('/parent')
  revalidatePath('/parent/announcement')
  revalidatePath('/teacher')
  revalidatePath('/teacher/announcement')
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/announcement')
  revalidatePath('/parent')
  revalidatePath('/parent/announcement')
  revalidatePath('/teacher')
  revalidatePath('/teacher/announcement')
}
