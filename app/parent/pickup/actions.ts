'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { isValidPhoneInput, normalizePhilippineMobile, PHONE_VALIDATION_MESSAGE } from '@/lib/phone'
import { isPickupRelationship, PICKUP_RELATIONSHIP_MESSAGE } from '@/lib/pickup-relationships'
import { logActivity } from '@/lib/activity-log'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // matches the pickup-photos bucket's own file_size_limit

export type PickupPersonInput = {
  fullName: string
  relationship: string
  phoneNumber: string
}

// `currentRelationship` is the value already stored on an edited row: a legacy
// free-text relationship (from before this was a fixed list) stays valid as
// long as it isn't changed, so editing just the phone number doesn't force a
// relationship re-pick.
function validateInput(input: PickupPersonInput, currentRelationship?: string | null): string | null {
  const fullName = input.fullName.trim()
  if (!fullName) return 'Enter the full name of the authorized person.'
  if (!isValidName(fullName)) return NAME_VALIDATION_MESSAGE
  const relationship = input.relationship.trim()
  if (!isPickupRelationship(relationship) && !(currentRelationship && relationship === currentRelationship)) {
    return PICKUP_RELATIONSHIP_MESSAGE
  }
  const phone = input.phoneNumber.trim()
  if (phone && !isValidPhoneInput(phone)) return PHONE_VALIDATION_MESSAGE
  return null
}

function normalizedPhone(raw: string) {
  const phone = raw.trim()
  return phone ? normalizePhilippineMobile(phone) : null
}

// Ownership of `studentId` is enforced by parents_manage_own_students_pickups'
// WITH CHECK on the regular RLS-scoped client — no separate parent_student
// lookup needed here, the insert itself fails closed if the student isn't
// actually linked to this parent.
export async function addPickupPerson(
  studentId: string,
  input: PickupPersonInput,
  formData: FormData
): Promise<{ error: string } | { id: string }> {
  const validationError = validateInput(input)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in.' }
  }

  // Photo upload happens before the row insert, same reasoning as
  // components/feedback/actions.ts's submitFeedback — a failed upload fails
  // the whole submission cleanly instead of leaving a row with a dangling
  // photo_path, or a photo nothing points at.
  const photoEntry = formData.get('photo')
  const photo = photoEntry instanceof File ? photoEntry : null
  let photoPath: string | null = null
  if (photo && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: 'Photo must be under 2MB.' }
    }
    if (!photo.type.startsWith('image/')) {
      return { error: 'Please attach an image file.' }
    }
    const extension = photo.name.split('.').pop() || 'jpg'
    photoPath = `${studentId}/${randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('pickup-photos').upload(photoPath, photo)
    if (uploadError) {
      return { error: uploadError.message }
    }
  }

  const { data, error } = await supabase
    .from('authorized_pickups')
    .insert({
      student_id: studentId,
      full_name: input.fullName.trim(),
      relationship: input.relationship.trim() || null,
      phone_number: normalizedPhone(input.phoneNumber),
      photo_path: photoPath,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Added ${input.fullName.trim()} as an authorized pickup person`,
    targetTable: 'authorized_pickups',
    targetId: data.id,
  })

  revalidatePath('/parent/pickup')
  return { id: data.id }
}

export async function updatePickupPerson(
  pickupId: string,
  input: PickupPersonInput,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from('authorized_pickups')
    .select('id, student_id, relationship')
    .eq('id', pickupId)
    .single()
  if (!existing) {
    return { error: 'This pickup person could not be found.' }
  }

  const validationError = validateInput(input, existing.relationship)
  if (validationError) {
    return { error: validationError }
  }

  const photoEntry = formData.get('photo')
  const photo = photoEntry instanceof File ? photoEntry : null
  const updates: Record<string, unknown> = {
    full_name: input.fullName.trim(),
    relationship: input.relationship.trim() || null,
    phone_number: normalizedPhone(input.phoneNumber),
    updated_at: new Date().toISOString(),
  }

  if (photo && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: 'Photo must be under 2MB.' }
    }
    if (!photo.type.startsWith('image/')) {
      return { error: 'Please attach an image file.' }
    }
    const extension = photo.name.split('.').pop() || 'jpg'
    const photoPath = `${existing.student_id}/${randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('pickup-photos').upload(photoPath, photo)
    if (uploadError) {
      return { error: uploadError.message }
    }
    updates.photo_path = photoPath
  }

  const { error } = await supabase.from('authorized_pickups').update(updates).eq('id', pickupId)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Updated authorized pickup person ${input.fullName.trim()}`,
    targetTable: 'authorized_pickups',
    targetId: pickupId,
  })

  revalidatePath('/parent/pickup')
}

export async function removePickupPersonPhoto(pickupId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('authorized_pickups')
    .update({ photo_path: null, updated_at: new Date().toISOString() })
    .eq('id', pickupId)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: "Removed an authorized pickup person's photo",
    targetTable: 'authorized_pickups',
    targetId: pickupId,
  })

  revalidatePath('/parent/pickup')
}

export async function removePickupPerson(pickupId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = await supabase.from('authorized_pickups').select('full_name').eq('id', pickupId).maybeSingle()

  const { error } = await supabase.from('authorized_pickups').delete().eq('id', pickupId)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Removed authorized pickup person ${existing?.full_name ?? ''}`.trim(),
    targetTable: 'authorized_pickups',
    targetId: pickupId,
  })

  revalidatePath('/parent/pickup')
}
