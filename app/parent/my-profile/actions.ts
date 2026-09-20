'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidDob, dobRangeMessage, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { genderFromParentRelationship } from '@/lib/gender'

type NormalizedProfile = {
  phone_number: string | null
  date_of_birth: string | null
  relationship_to_student: string | null
  gender: string | null
}

export async function updateMyProfile(updates: {
  phone_number: string
  date_of_birth: string
  relationship_to_student: string
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

  // Same "parent must be at least 10 years older than the student" rule
  // enforced at /enroll and /parent/enroll-a-student — editing DOB here
  // was the one place that could silently violate it after the fact for
  // an existing linked child.
  if (dob) {
    const { data: applications } = await supabase
      .from('applications')
      .select('student_dob')
      .eq('created_parent_id', user.id)

    const newParentDob = new Date(dob)
    for (const app of applications ?? []) {
      const minParentDob = new Date(app.student_dob)
      minParentDob.setFullYear(minParentDob.getFullYear() - 10)
      if (newParentDob > minParentDob) {
        return {
          error: 'This date of birth would make you less than 10 years older than one of your linked students. Please check the date.',
        }
      }
    }
  }

  const relationship = updates.relationship_to_student || null
  const normalized: NormalizedProfile = {
    phone_number: phone ? normalizePhilippineMobile(phone) : null,
    date_of_birth: dob || null,
    relationship_to_student: relationship,
    gender: genderFromParentRelationship(relationship, updates.gender),
  }

  const { error } = await supabase.from('profiles').update(normalized).eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/parent/my-profile')
  revalidatePath('/parent')

  // Returned so the form can reset its local state to the canonical
  // (normalized) values instead of whatever was literally typed — e.g. the
  // phone number is reformatted server-side, so without this the form kept
  // showing Cancel / Discard after a successful save because its local
  // state no longer matched what it thought the saved value was.
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
  // Cache-bust so the new photo shows immediately instead of the browser
  // reusing a cached response for the same URL as the previous photo.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/parent/my-profile')
  revalidatePath('/parent')
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

  revalidatePath('/parent/my-profile')
  revalidatePath('/parent')
}
