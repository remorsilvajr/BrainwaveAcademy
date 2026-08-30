'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleBlockUser(userId: string, currentStatus: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked'

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: newStatus })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/user-management')
}
