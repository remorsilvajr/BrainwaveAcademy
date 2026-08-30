'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'

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
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    phone_number: string
    role: string
    relationship_to_student: string
  }
) {
  const supabase = await createClient()

  const phone = updates.phone_number.trim()
  if (phone && !isValidPhilippineMobile(phone)) {
    throw new Error('Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: updates.first_name,
      middle_name: updates.middle_name.trim() || null,
      last_name: updates.last_name,
      role: updates.role,
      phone_number: phone ? normalizePhilippineMobile(phone) : null,
      relationship_to_student: updates.role === 'parent' ? updates.relationship_to_student || null : null,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/user-management')
}
