'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidDob, dobRangeMessage, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'

type NormalizedProfile = { phone_number: string | null; date_of_birth: string | null; gender: string | null }

export async function updateMyProfile(updates: {
  phone_number: string
  date_of_birth: string
  gender: string
}): Promise<{ error: string } | NormalizedProfile> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const phone = updates.phone_number.trim()
  if (phone && !isValidPhilippineMobile(phone)) {
    return { error: 'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.' }
  }

  const dob = updates.date_of_birth.trim()
  if (dob && !isValidDob(dob, { minAge: MIN_ADULT_AGE, maxAge: MAX_AGE })) {
    return { error: dobRangeMessage('You', MIN_ADULT_AGE, MAX_AGE) }
  }

  const normalized: NormalizedProfile = {
    phone_number: phone ? normalizePhilippineMobile(phone) : null,
    date_of_birth: dob || null,
    gender: updates.gender || null,
  }

  const { error } = await supabase.from('profiles').update(normalized).eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher/my-profile')
  revalidatePath('/teacher')

  // See app/parent/my-profile/actions.ts for why the normalized values are
  // returned rather than trusting the client's own typed input.
  return normalized
}

export async function uploadMyAvatar(formData: FormData): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please choose an image.' }
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/teacher/my-profile')
  revalidatePath('/teacher')
  return { url: avatarUrl }
}

export async function removeMyAvatar(): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher/my-profile')
  revalidatePath('/teacher')
}
