'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { parsePickupIdCode, normalizePickupIdLabel, findPickupIdByLabel } from '@/lib/pickup-id'
import { PICKUP_PHOTO_URL_TTL_SECONDS } from '@/lib/pickup-list'
import { pickupDisplayName } from '@/lib/pickup-names'
import { isTerminalStudentStatus } from '@/lib/student-status'
import { revalidatePath } from 'next/cache'
import { notifyParentsOfStudent } from '@/lib/notify'
import { formatManilaDate, formatManilaTime } from '@/lib/pickup-history'

// "Record Pickup" in Pickup Verification: the child is being collected by this
// authorized person, now. Writes the pickup history (pickup_records) that staff and
// the child's parents can read, tells the parents, and logs it. The person is looked
// up again here (never trusted from the browser) and must still be on the child's
// list; the child must still be enrolled. Re-derives the caller's role, since Server
// Actions skip the middleware's role routing.
export async function recordPickup(authorizedPickupId: string, method: 'scan' | 'name'): Promise<{ error: string } | { pickedUpAt: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }
  const { data: profile } = await supabase.from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return { error: 'Only teachers and admins can do this.' }
  }
  if (method !== 'scan' && method !== 'name') return { error: 'Invalid check method.' }

  const { data: person } = await supabase
    .from('authorized_pickups')
    .select('id, student_id, first_name, middle_name, last_name, relationship')
    .eq('id', authorizedPickupId)
    .maybeSingle()
  if (!person) return { error: 'This person is no longer on the authorized list. Do not release the child without admin confirmation.' }

  const { data: student } = await supabase.from('students').select('first_name, last_name, enrollment_status').eq('id', person.student_id).maybeSingle()
  if (!student || isTerminalStudentStatus(student.enrollment_status)) return { error: 'This child is no longer enrolled.' }

  const personName = pickupDisplayName(person)
  const studentName = `${student.first_name} ${student.last_name}`
  const { data: record, error } = await supabase
    .from('pickup_records')
    .insert({
      student_id: person.student_id,
      authorized_pickup_id: person.id,
      student_name: studentName,
      person_name: personName,
      relationship: person.relationship,
      method,
      recorded_by: user.id,
      recorded_by_name: `${profile.first_name} ${profile.last_name}`,
    })
    .select('picked_up_at')
    .single()
  if (error || !record) return { error: error?.message ?? 'Could not record the pickup.' }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Recorded pickup by "${personName}"${method === 'scan' ? ' (Pickup ID scanned)' : ' (name checked)'}`,
    targetTable: 'students',
    targetId: person.student_id,
  })
  await notifyParentsOfStudent(person.student_id, {
    kind: 'message',
    title: `${student.first_name} was picked up`,
    body: `${studentName} was picked up by ${personName}${person.relationship ? ` (${person.relationship})` : ''} at ${formatManilaTime(record.picked_up_at)}, ${formatManilaDate(record.picked_up_at)}.`,
    href: '/parent/pickup?tab=history',
  })

  revalidatePath('/admin/pickup-verification')
  revalidatePath('/teacher/pickup-verification')
  revalidatePath('/parent/pickup')
  return { pickedUpAt: record.picked_up_at }
}

export type ScannedPickup = {
  id: string
  studentId: string
  studentName: string
  name: string
  relationship: string | null
  phone: string | null
  photoUrl: string | null
}

// Verifies a scanned Pickup ID (the QR on an authorized person's card) and returns who
// it belongs to and which child they may collect. The signature check means a code
// cannot be made up; the lookup means a person removed from the list no longer
// verifies. It only says "this person is on file": the caller still compares the
// photo with the person in front of them. Returns `{ error }` for every expected
// failure (a thrown error is redacted in production). Re-derives the caller's role,
// since Server Actions skip the middleware's role routing.
export async function verifyPickupCard(code: string): Promise<{ error: string } | { person: ScannedPickup }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return { error: 'Only teachers and admins can do this.' }
  }

  const invalid = { error: 'This Pickup ID is not valid, or the person is no longer authorized. Do not release the child without admin confirmation.' }
  if (typeof code !== 'string' || code.length > 200) return invalid
  // The QR's full code, or the short "PU-XXXX-XXXX" printed under it, typed by hand.
  let pickupId = parsePickupIdCode(code)
  if (!pickupId && normalizePickupIdLabel(code)) {
    const { data: everyone } = await supabase.from('authorized_pickups').select('id')
    pickupId = findPickupIdByLabel(code, (everyone ?? []).map((p) => p.id))
  }
  if (!pickupId) return invalid

  const { data: row } = await supabase
    .from('authorized_pickups')
    .select('id, student_id, first_name, middle_name, last_name, relationship, phone_number, photo_path')
    .eq('id', pickupId)
    .maybeSingle()
  if (!row) return invalid

  const { data: student } = await supabase
    .from('students')
    .select('first_name, last_name, enrollment_status')
    .eq('id', row.student_id)
    .maybeSingle()
  // A withdrawn or graduated child's pickup people are not on the verification list.
  if (!student || isTerminalStudentStatus(student.enrollment_status)) return invalid

  let photoUrl: string | null = null
  if (row.photo_path) {
    const { data: signed } = await createAdminClient().storage.from('pickup-photos').createSignedUrl(row.photo_path, PICKUP_PHOTO_URL_TTL_SECONDS)
    photoUrl = signed?.signedUrl ?? null
  }

  const name = pickupDisplayName(row)
  await logActivity(supabase, {
    actorId: user.id,
    action: `Scanned pickup ID for "${name}"`,
    targetTable: 'students',
    targetId: row.student_id,
  })

  return {
    person: {
      id: row.id,
      studentId: row.student_id,
      studentName: `${student.first_name} ${student.last_name}`,
      name,
      relationship: row.relationship,
      phone: row.phone_number,
      photoUrl,
    },
  }
}
