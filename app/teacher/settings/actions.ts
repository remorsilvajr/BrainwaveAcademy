'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateNotificationPreferences(updates: {
  email_notifications_enabled: boolean
  sms_notifications_enabled: boolean
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher/settings')
}
