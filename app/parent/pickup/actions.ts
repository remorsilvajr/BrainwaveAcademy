'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyParentsOfStudent } from '@/lib/notify'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidPhoneInput, normalizePhilippineMobile, PHONE_VALIDATION_MESSAGE } from '@/lib/phone'
import { isAllowedPickupRelationship, OTHER_RELATIONSHIP, OTHER_SPEC_MESSAGE, parseRelationship, PICKUP_RELATIONSHIP_MESSAGE } from '@/lib/pickup-relationships'
import { logActivity } from '@/lib/activity-log'
import { pickupDisplayName } from '@/lib/pickup-names'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // matches the pickup-photos bucket's own file_size_limit

export type PickupPersonInput = {
  firstName: string
  middleName: string
  lastName: string
  relationship: string
  phoneNumber: string
}

// `currentRelationship` is the value already stored on an edited row: a legacy
// free-text relationship (from before this was a fixed list) stays valid as
// long as it isn't changed, so editing just the phone number doesn't force a
// relationship re-pick.
function validateInput(input: PickupPersonInput, currentRelationship?: string | null): string | null {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName) return 'Enter the first name of the authorized person.'
  if (!lastName) return 'Enter the last name of the authorized person.'
  if (!isValidName(firstName) || !isValidName(lastName)) return NAME_VALIDATION_MESSAGE
  const middleName = input.middleName.trim()
  if (middleName && !isValidName(middleName)) return NAME_VALIDATION_MESSAGE
  const relationship = input.relationship.trim()
  if (!isAllowedPickupRelationship(relationship) && !(currentRelationship && relationship === currentRelationship)) {
    return parseRelationship(relationship).choice === OTHER_RELATIONSHIP ? OTHER_SPEC_MESSAGE : PICKUP_RELATIONSHIP_MESSAGE
  }
  const phone = input.phoneNumber.trim()
  if (phone && !isValidPhoneInput(phone)) return PHONE_VALIDATION_MESSAGE
  return null
}

// Trimmed and title-cased at write time only, same as every other name in the app.
function nameColumns(input: PickupPersonInput) {
  const middle = input.middleName.trim()
  return {
    first_name: toTitleCase(input.firstName.trim()),
    middle_name: middle ? toTitleCase(middle) : null,
    last_name: toTitleCase(input.lastName.trim()),
  }
}

function normalizedPhone(raw: string) {
  const phone = raw.trim()
  return phone ? normalizePhilippineMobile(phone) : null
}

// Parents and admins both manage pickup people through these actions. A parent
// writes through their own RLS-scoped client (parents_manage_own_students_pickups
// decides what they may touch). An admin has no write policy on the table or the
// bucket, so for a caller whose profile says admin this hands back the
// service-role client: the role check here is what authorizes it (a Server
// Action skips middleware), and every admin change notifies the child's parents.
async function pickupWriter(): Promise<
  { userId: string; client: SupabaseClient; isAdmin: boolean } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') return { userId: user.id, client: createAdminClient(), isAdmin: true }
  return { userId: user.id, client: supabase, isAdmin: false }
}

function revalidatePickupPages() {
  revalidatePath('/parent/pickup')
  revalidatePath('/admin/pickup-verification')
  revalidatePath('/teacher/pickup-verification')
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

  const writer = await pickupWriter()
  if ('error' in writer) return writer
  const { client: supabase, userId, isAdmin } = writer
  if (isAdmin) {
    const { data: student } = await supabase.from('students').select('id').eq('id', studentId).maybeSingle()
    if (!student) return { error: 'This student could not be found.' }
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

  const names = nameColumns(input)
  const { data, error } = await supabase
    .from('authorized_pickups')
    .insert({
      student_id: studentId,
      ...names,
      relationship: input.relationship.trim() || null,
      phone_number: normalizedPhone(input.phoneNumber),
      photo_path: photoPath,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: userId,
    action: `Added ${pickupDisplayName(names)} as an authorized pickup person`,
    targetTable: 'authorized_pickups',
    targetId: data.id,
  })
  if (isAdmin) {
    await notifyParentsOfStudent(studentId, {
      kind: 'message',
      title: 'The school added an authorized pickup person',
      body: `${pickupDisplayName(names)} was added to your child's pickup list.`,
      href: '/parent/pickup',
    })
  }

  revalidatePickupPages()
  return { id: data.id }
}

// `removePhoto` clears the stored photo in this same update, after validation,
// so a failed save can't leave a photo already deleted (a separate remove call
// committed immediately, before the rest of the form was checked). A newly
// attached photo wins over `removePhoto`.
export async function updatePickupPerson(
  pickupId: string,
  input: PickupPersonInput,
  formData: FormData,
  removePhoto = false
): Promise<{ error: string } | undefined> {
  const writer = await pickupWriter()
  if ('error' in writer) return writer
  const { client: supabase, userId, isAdmin } = writer

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
  const names = nameColumns(input)
  const updates: Record<string, unknown> = {
    ...names,
    relationship: input.relationship.trim() || null,
    phone_number: normalizedPhone(input.phoneNumber),
    updated_at: new Date().toISOString(),
  }
  if (removePhoto) updates.photo_path = null

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
    actorId: userId,
    action: `Updated authorized pickup person ${pickupDisplayName(names)}`,
    targetTable: 'authorized_pickups',
    targetId: pickupId,
  })
  if (isAdmin) {
    const photoNote =
      updates.photo_path === undefined ? '' : updates.photo_path === null ? ' Their photo was removed.' : ' Their photo was changed.'
    await notifyParentsOfStudent(existing.student_id, {
      kind: 'message',
      title: 'The school updated an authorized pickup person',
      body: `${pickupDisplayName(names)}'s pickup details were updated.${photoNote}`,
      href: '/parent/pickup',
    })
  }

  revalidatePickupPages()
}

export async function removePickupPerson(pickupId: string): Promise<{ error: string } | undefined> {
  const writer = await pickupWriter()
  if ('error' in writer) return writer
  const { client: supabase, userId, isAdmin } = writer

  const { data: existing } = await supabase
    .from('authorized_pickups')
    .select('student_id, first_name, middle_name, last_name')
    .eq('id', pickupId)
    .maybeSingle()

  const { error } = await supabase.from('authorized_pickups').delete().eq('id', pickupId)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: userId,
    action: `Removed authorized pickup person ${existing ? pickupDisplayName(existing) : ''}`.trim(),
    targetTable: 'authorized_pickups',
    targetId: pickupId,
  })
  if (isAdmin && existing) {
    await notifyParentsOfStudent(existing.student_id, {
      kind: 'message',
      title: 'The school removed an authorized pickup person',
      body: `${pickupDisplayName(existing)} is no longer authorized to pick up your child.`,
      href: '/parent/pickup',
    })
  }

  revalidatePickupPages()
}
