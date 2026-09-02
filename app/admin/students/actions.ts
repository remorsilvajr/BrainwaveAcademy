'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_AGE } from '@/lib/dob'
import { logActivity } from '@/lib/activity-log'

export async function updateStudentRecord(
  studentId: string,
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    date_of_birth: string
    gender: string
  }
) {
  const supabase = await createClient()

  const firstName = updates.first_name.trim()
  const lastName = updates.last_name.trim()
  const middleName = updates.middle_name.trim()

  if (!firstName || !lastName || !updates.date_of_birth || !updates.gender) {
    throw new Error('First name, last name, date of birth, and gender are required.')
  }
  if (!isValidName(firstName) || !isValidName(lastName) || (middleName && !isValidName(middleName))) {
    throw new Error(NAME_VALIDATION_MESSAGE)
  }
  if (!isValidDob(updates.date_of_birth, { minAge: MIN_STUDENT_AGE, maxAge: MAX_AGE })) {
    throw new Error(dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_AGE))
  }

  const { error } = await supabase
    .from('students')
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      date_of_birth: updates.date_of_birth,
      gender: updates.gender,
    })
    .eq('id', studentId)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Edited student record',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
}

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

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated student photo',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin/student-dashboard')
  return avatarUrl
}

export async function removeStudentAvatar(studentId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('students').update({ avatar_url: null }).eq('id', studentId)
  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed student photo',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin/student-dashboard')
}
