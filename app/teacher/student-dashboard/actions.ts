'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'
import { tracksDailyAttendance } from '@/lib/classrooms'
import { getTeacherAssignedClassrooms } from '@/lib/teacher-classrooms'
import { manilaTimeNow, validateAttendanceTimes } from '@/lib/attendance-times'

const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const
const MILESTONE_CATEGORIES = [
  'physical_health_motor',
  'character_values',
  'language',
  'social_emotional',
  'cognitive',
  'creative',
] as const

export async function recordAttendance(input: {
  student_id: string
  date: string
  status: string
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }
  if (!(ATTENDANCE_STATUSES as readonly string[]).includes(input.status)) {
    return { error: 'Invalid attendance status.' }
  }

  // Every rule below is enforced here, not just in the UI: a Server Action is
  // directly callable with any arguments, and the date picker's `max` and the
  // read-only past dates on /teacher/attendance are only front-end niceties.
  if (!isRealIsoDate(input.date)) {
    return { error: 'Enter a valid date.' }
  }
  const today = todayIso()
  if (input.date > today) {
    return { error: 'Attendance cannot be recorded for a future date.' }
  }
  // Student attendance is recorded by teachers only. The admin records attendance for the
  // teachers themselves (app/admin/attendance/actions.ts) and can view students' records.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') {
    return { error: 'Only teachers can record student attendance.' }
  }
  if (input.date !== today) {
    return { error: 'Student attendance can only be recorded for today.' }
  }

  // Tutorial and Quiz Bee & Competitions aren't daily, so their
  // students don't get attendance at all.
  const { data: student } = await supabase.from('students').select('classroom_id').eq('id', input.student_id).maybeSingle()
  if (!student) {
    return { error: 'Student not found.' }
  }
  if (student.classroom_id) {
    const { data: classroom } = await supabase.from('classrooms').select('name, slug').eq('id', student.classroom_id).maybeSingle()
    if (classroom && !tracksDailyAttendance(classroom)) {
      return { error: `Attendance is not taken for ${classroom.name}, since it does not run daily.` }
    }
  }
  // Only for the classes this teacher teaches (the database policy says the same).
  const assigned = await getTeacherAssignedClassrooms(supabase, user.id)
  if (!student.classroom_id || !assigned.some((c) => c.id === student.classroom_id)) {
    return { error: 'You can only take attendance for the classes you teach.' }
  }

  // No DB-level uniqueness on (student_id, date) to rely on for an upsert,
  // so re-marking the same day updates the existing row instead of piling
  // up duplicates. Ordered + limited to 1 rather than .maybeSingle() —
  // that throws on more than one match, and duplicate rows from before
  // this update-in-place logic existed are still floating around.
  const { data: existingRows } = await supabase
    .from('attendance')
    .select('id, arrival_time')
    .eq('student_id', input.student_id)
    .eq('date', input.date)
    .order('created_at', { ascending: false })
    .limit(1)
  const existing = existingRows?.[0]

  // Present or late stamps the arrival time now (Manila) unless one is already set;
  // the teacher can correct it on the roster. Absent clears both times.
  const times =
    input.status === 'absent'
      ? { arrival_time: null, departure_time: null }
      : existing?.arrival_time
        ? {}
        : { arrival_time: manilaTimeNow() }

  const { error } = existing
    ? await supabase
        .from('attendance')
        .update({ status: input.status, recorded_by: user.id, ...times })
        .eq('id', existing.id)
    : await supabase.from('attendance').insert({
        student_id: input.student_id,
        date: input.date,
        status: input.status,
        recorded_by: user.id,
        ...times,
      })

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Recorded attendance (${input.status})`,
    targetTable: 'attendance',
    targetId: input.student_id,
  })

  revalidatePath('/teacher/student-dashboard')
  revalidatePath('/teacher')
  revalidatePath('/parent/student-dashboard')
}

// Arrival / departure times on today's record (the roster's time fields and its
// "Now" button). Same rules as recordAttendance: a teacher, today only, their own
// class, and the child must already be marked present or late.
export async function recordAttendanceTimes(input: {
  student_id: string
  arrival_time: string | null
  departure_time: string | null
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') return { error: 'Only teachers can record student attendance.' }

  const { data: student } = await supabase.from('students').select('classroom_id').eq('id', input.student_id).maybeSingle()
  if (!student) return { error: 'Student not found.' }
  const assigned = await getTeacherAssignedClassrooms(supabase, user.id)
  if (!student.classroom_id || !assigned.some((c) => c.id === student.classroom_id)) {
    return { error: 'You can only take attendance for the classes you teach.' }
  }

  const today = todayIso()
  const { data: rows } = await supabase
    .from('attendance')
    .select('id, status')
    .eq('student_id', input.student_id)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
  const record = rows?.[0]
  if (!record) return { error: 'Mark the child present or late first.' }

  const arrival = input.arrival_time || null
  const departure = input.departure_time || null
  const problem = validateAttendanceTimes({ status: record.status, arrival, departure, now: manilaTimeNow() })
  if (problem) return { error: problem }

  const { error } = await supabase
    .from('attendance')
    .update({ arrival_time: arrival, departure_time: departure, recorded_by: user.id })
    .eq('id', record.id)
  if (error) return { error: error.message }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Recorded arrival/departure times (${arrival ?? '-'} to ${departure ?? '-'})`,
    targetTable: 'attendance',
    targetId: input.student_id,
  })

  revalidatePath('/teacher/attendance')
  revalidatePath('/teacher/student-dashboard')
  revalidatePath('/parent/student-dashboard')
}

export async function submitMilestoneAssessment(input: {
  student_id: string
  category: string
  assessment_date: string
  notes: string
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }
  if (!(MILESTONE_CATEGORIES as readonly string[]).includes(input.category)) {
    return { error: 'Invalid milestone category.' }
  }

  // One current record per student+category, not an append-only history —
  // re-assessing a domain updates its existing row so it stays editable
  // instead of only ever being addable. Ordered + limited to 1 rather than
  // .maybeSingle() — that throws on more than one match, and duplicate
  // rows from before this update-in-place logic existed are still
  // floating around for at least one student/category in this project's
  // dev data.
  const { data: existingRows } = await supabase
    .from('milestones')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('category', input.category)
    .order('created_at', { ascending: false })
    .limit(1)
  const existing = existingRows?.[0]

  const trimmedNotes = input.notes.trim()

  // Submitting with the notes cleared removes the assessment outright
  // instead of saving an empty note — the domain just goes back to "Not
  // yet assessed" — rather than a separate Remove control elsewhere on
  // the page. No-op (not an error) when there was nothing to remove.
  if (!trimmedNotes) {
    if (existing) {
      const { error } = await supabase.from('milestones').delete().eq('id', existing.id)
      if (error) {
        return { error: error.message }
      }
      await logActivity(supabase, {
        actorId: user.id,
        action: `Removed milestone assessment (${input.category})`,
        targetTable: 'milestones',
        targetId: input.student_id,
      })
    }
    revalidatePath('/teacher/student-dashboard')
    revalidatePath('/teacher')
    revalidatePath('/parent/student-dashboard')
    return
  }

  if (!isRealIsoDate(input.assessment_date) || input.assessment_date > todayIso()) {
    return { error: 'Enter a valid assessment date that is not in the future.' }
  }

  const { error } = existing
    ? await supabase
        .from('milestones')
        .update({
          assessment_date: input.assessment_date,
          notes: trimmedNotes,
          assessed_by: user.id,
        })
        .eq('id', existing.id)
    : await supabase.from('milestones').insert({
        student_id: input.student_id,
        category: input.category,
        assessment_date: input.assessment_date,
        notes: trimmedNotes,
        assessed_by: user.id,
      })

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Submitted milestone assessment (${input.category})`,
    targetTable: 'milestones',
    targetId: input.student_id,
  })

  revalidatePath('/teacher/student-dashboard')
  revalidatePath('/teacher')
  revalidatePath('/parent/student-dashboard')
}
