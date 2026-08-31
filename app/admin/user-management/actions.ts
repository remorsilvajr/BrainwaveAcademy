'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { logActivity } from '@/lib/activity-log'

// A parent account that isn't active (inactive or blocked) shouldn't leave
// their linked students showing as actively enrolled — keeps the Students
// tab consistent with the parent's actual account state, in both
// directions (deactivating the parent deactivates their students;
// reactivating the parent restores them too).
async function syncLinkedStudentsStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  accountStatus: string
) {
  const studentStatus = accountStatus === 'active' ? 'active' : 'inactive'

  const { data: links } = await supabase
    .from('parent_student')
    .select('student_id')
    .eq('parent_id', parentId)

  const studentIds = (links ?? []).map((l) => l.student_id)
  if (studentIds.length > 0) {
    await supabase.from('students').update({ enrollment_status: studentStatus }).in('id', studentIds)
  }
}

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

  await syncLinkedStudentsStatus(supabase, userId, newStatus)

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: newStatus === 'blocked' ? 'Blocked user account' : 'Unblocked user account',
    targetTable: 'profiles',
    targetId: userId,
  })

  revalidatePath('/admin/user-management')
  revalidatePath('/admin/students')
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

  await syncLinkedStudentsStatus(supabase, userId, status)

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Set user account to ${status}`,
    targetTable: 'profiles',
    targetId: userId,
  })

  revalidatePath('/admin/user-management')
  revalidatePath('/admin/students')
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

  const firstName = updates.first_name.trim()
  const lastName = updates.last_name.trim()
  const middleName = updates.middle_name.trim()

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required.')
  }
  if (!isValidName(firstName) || !isValidName(lastName) || (middleName && !isValidName(middleName))) {
    throw new Error(NAME_VALIDATION_MESSAGE)
  }

  const phone = updates.phone_number.trim()
  if (phone && !isValidPhilippineMobile(phone)) {
    throw new Error('Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      role: updates.role,
      phone_number: phone ? normalizePhilippineMobile(phone) : null,
      relationship_to_student: updates.role === 'parent' ? updates.relationship_to_student || null : null,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Edited user account',
    targetTable: 'profiles',
    targetId: userId,
  })

  revalidatePath('/admin/user-management')
}

export async function updateUserAvatar(userId: string, formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose an image.')
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (updateError) {
    throw new Error(updateError.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated user account photo',
    targetTable: 'profiles',
    targetId: userId,
  })

  revalidatePath('/admin/user-management')
  return avatarUrl
}

export async function removeUserAvatar(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed user account photo',
    targetTable: 'profiles',
    targetId: userId,
  })

  revalidatePath('/admin/user-management')
}
