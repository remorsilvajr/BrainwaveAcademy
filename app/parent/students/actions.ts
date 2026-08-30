'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// RLS (parents_update_own_children_avatar) enforces that this parent
// actually has a parent_student link to studentId — no manual ownership
// check needed here, the database rejects it otherwise.
export async function updateStudentAvatar(studentId: string, formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose an image.')
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `student-${studentId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('students').update({ avatar_url: avatarUrl }).eq('id', studentId)
  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/parent/students')
  return avatarUrl
}

export async function removeStudentAvatar(studentId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('students').update({ avatar_url: null }).eq('id', studentId)
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/parent/students')
}
