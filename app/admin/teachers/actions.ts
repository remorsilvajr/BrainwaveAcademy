'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { logActivity } from '@/lib/activity-log'

// Deliberately doesn't touch role or account_status — those stay the
// exclusive job of User Management (role changes, block/unblock) so this
// page and that one don't end up as two different places that can each
// half-manage the same account, the way Enroll A Student and Applications
// are kept as two separate steps rather than merged. This is just the
// teacher-specific directory + the same personal-details fields a teacher
// can already edit about themselves from their own My Profile.
export async function updateTeacherRecord(
  teacherId: string,
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    phone_number: string
    date_of_birth: string
    gender: string
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

  const dob = updates.date_of_birth.trim()
  if (dob && !isValidDob(dob, { minAge: MIN_ADULT_AGE, maxAge: MAX_AGE })) {
    throw new Error(dobRangeMessage('Teacher', MIN_ADULT_AGE, MAX_AGE))
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      phone_number: phone ? normalizePhilippineMobile(phone) : null,
      date_of_birth: dob || null,
      gender: updates.gender || null,
    })
    .eq('id', teacherId)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Edited teacher record',
    targetTable: 'profiles',
    targetId: teacherId,
  })

  revalidatePath('/admin/teachers')
}

// Same avatars-bucket path convention as updateUserAvatar in
// app/admin/user-management/actions.ts (own-account photo, not a
// student-prefixed one) — covered by the existing admins_manage_any_avatar
// storage policy, no new RLS needed.
export async function updateTeacherAvatar(teacherId: string, formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose an image.')
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `${teacherId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', teacherId)
  if (updateError) {
    throw new Error(updateError.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated teacher photo',
    targetTable: 'profiles',
    targetId: teacherId,
  })

  revalidatePath('/admin/teachers')
  return avatarUrl
}

export async function removeTeacherAvatar(teacherId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', teacherId)
  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed teacher photo',
    targetTable: 'profiles',
    targetId: teacherId,
  })

  revalidatePath('/admin/teachers')
}
