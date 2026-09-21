'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { parsePickupIdCode } from '@/lib/pickup-id'
import { PICKUP_PHOTO_URL_TTL_SECONDS } from '@/lib/pickup-list'
import { pickupDisplayName } from '@/lib/pickup-names'
import { isTerminalStudentStatus } from '@/lib/student-status'

// A lightweight audit trail for "someone at the front desk checked this
// person against the list" — deliberately not a new table, just an
// activity_log entry, since the actual authorization data already lives in
// authorized_pickups and doesn't need a separate check-in/out record for
// what this feature asked for.
//
// Server Actions bypass middleware's role-based routing entirely (see the
// CLAUDE.md note on this), so this re-checks the caller is teacher/admin
// itself rather than trusting that only those roles could have reached the
// page that renders the "Log Check" button.
export async function logPickupCheck(studentId: string, personName: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return { error: 'Only teachers and admins can do this.' }
  }

  // target_id here is the student being checked, not a specific
  // authorized_pickups row (a check can match, or fail to match, any
  // number of them) — targetTable is 'students' so the Activity Log's
  // existing student-label resolution picks it up correctly.
  await logActivity(supabase, {
    actorId: user.id,
    action: `Checked pickup authorization for "${personName.trim()}"`,
    targetTable: 'students',
    targetId: studentId,
  })
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
  const pickupId = parsePickupIdCode(code)
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
