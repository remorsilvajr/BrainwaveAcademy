'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

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
