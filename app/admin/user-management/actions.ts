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

export async function updateAccountStatus(userId: string, status: 'active' | 'inactive') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/user-management')
}

export async function updateUserProfile(
  userId: string,
  updates: { first_name: string; last_name: string; phone_number: string; role: string }
) {
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/user-management')
}
