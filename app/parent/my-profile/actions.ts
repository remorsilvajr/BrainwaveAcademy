'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'

export async function updateMyProfile(updates: {
  phone_number: string
  date_of_birth: string
  relationship_to_student: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your session has expired. Please log in again.')
  }

  const phone = updates.phone_number.trim()
  if (phone && !isValidPhilippineMobile(phone)) {
    throw new Error('Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      phone_number: phone ? normalizePhilippineMobile(phone) : null,
      date_of_birth: updates.date_of_birth || null,
      relationship_to_student: updates.relationship_to_student || null,
    })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/parent/my-profile')
  revalidatePath('/parent')
}

export async function uploadMyAvatar(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your session has expired. Please log in again.')
  }

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose an image.')
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust so the new photo shows immediately instead of the browser
  // reusing a cached response for the same URL as the previous photo.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/parent/my-profile')
  revalidatePath('/parent')
}
