'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { genderFromParentRelationship } from '@/lib/gender'
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

  // profiles.account_status is this app's own record of the block (used
  // for the UI, filtering, and middleware's short-TTL cookie check), but
  // it's not what actually stops a blocked user's *existing* session —
  // Supabase Auth doesn't know or care about our own columns. ban_duration
  // is the real enforcement: GoTrue rejects auth.getUser() for a banned
  // user almost immediately (independent of, and faster than, middleware's
  // own cookie-cache window), and also rejects any new sign-in attempt.
  // '876000h' (100 years) mirrors the Supabase admin SDK's own documented
  // example for "ban a user"; 'none' lifts it.
  const admin = createAdminClient()
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: newStatus === 'blocked' ? '876000h' : 'none',
  })
  if (banError) {
    throw new Error(banError.message)
  }

  // Same last_seen_at reasoning as forceLogoutUser below — blocking also
  // ends the user's session, so the Online indicator shouldn't keep
  // showing green for someone who was just blocked.
  if (newStatus === 'blocked') {
    await admin.from('profiles').update({ last_seen_at: null }).eq('id', userId)
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
    throw new Error(dobRangeMessage('This account', MIN_ADULT_AGE, MAX_AGE))
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: toTitleCase(firstName),
      middle_name: middleName ? toTitleCase(middleName) : null,
      last_name: toTitleCase(lastName),
      role: updates.role,
      phone_number: phone ? normalizePhilippineMobile(phone) : null,
      relationship_to_student: updates.role === 'parent' ? updates.relationship_to_student || null : null,
      date_of_birth: dob || null,
      gender:
        updates.role === 'teacher'
          ? updates.gender || null
          : updates.role === 'parent'
            ? genderFromParentRelationship(updates.relationship_to_student, updates.gender)
            : null,
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

// Ends a user's *current* session without blocking them — unlike
// toggleBlockUser's ban_duration: '876000h' (until manually unblocked),
// this sets a brief ban (see middleware.ts's account_status check for the
// other enforcement layer this pairs with) just long enough to reliably
// fail their next request's auth.getUser() call, then expires on its own
// so they can simply log back in right away. There's no direct "revoke
// this specific session" call in Supabase's admin API — ban_duration is
// the only real lever, so a short one is what "force log out" is built
// from here. A user who tries to log back in inside that ~15s window will
// briefly see "Incorrect email or password" (the generic error
// app/login/actions.ts already shows for a banned sign-in attempt) even
// though their password is fine — an accepted rough edge given how narrow
// the window is, not worth a special-cased error message for.
export async function forceLogoutUser(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '15s' })
  if (error) {
    throw new Error(error.message)
  }

  // Same reasoning as logout()/logoutAllDevices() in app/login/actions.ts —
  // last_seen_at only ever gets set by middleware's presence ping, never
  // cleared, so without this the target still shows "Online" until the
  // 5-minute window naturally lapses even though their session just ended.
  // Uses the admin client since this is someone else's row, not the
  // caller's own — self-update RLS doesn't apply here.
  await admin.from('profiles').update({ last_seen_at: null }).eq('id', userId)

  const supabase = await createClient()
  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Forced user log out',
    targetTable: 'profiles',
    targetId: userId,
  })
}
