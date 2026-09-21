'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'

const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const

// The admin marks a teacher present, late or absent for a day (today or any past day; the
// admin can also correct one). Student attendance is recorded by teachers, not here.
// Every rule is enforced here and by RLS (admins_manage_teacher_attendance), not just in the
// UI: a Server Action is directly callable with any arguments. Returns `{ error }` instead
// of throwing (a thrown Server Function error is redacted in a production build).
export async function recordTeacherAttendance(input: {
  teacher_id: string
  date: string
  status: string
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Only an admin can record teacher attendance.' }

  if (!(ATTENDANCE_STATUSES as readonly string[]).includes(input.status)) {
    return { error: 'Invalid attendance status.' }
  }
  if (!isRealIsoDate(input.date)) return { error: 'Enter a valid date.' }
  if (input.date > todayIso()) return { error: 'Attendance cannot be recorded for a future date.' }

  const { data: teacher } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', input.teacher_id)
    .eq('role', 'teacher')
    .is('deleted_at', null)
    .maybeSingle()
  if (!teacher) return { error: 'Teacher not found.' }

  // One row per teacher per day (unique in the database), so re-marking updates it.
  const { error } = await supabase
    .from('teacher_attendance')
    .upsert(
      { teacher_id: input.teacher_id, date: input.date, status: input.status, recorded_by: user.id },
      { onConflict: 'teacher_id,date' }
    )
  if (error) return { error: error.message }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Recorded teacher attendance (${input.status}) for ${input.date}`,
    targetTable: 'profiles',
    targetId: input.teacher_id,
  })

  revalidatePath('/admin/attendance')
}
