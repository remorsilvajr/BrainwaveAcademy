'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const
const MILESTONE_CATEGORIES = [
  'physical_health_motor',
  'character_values',
  'language',
  'social_emotional',
  'cognitive',
  'creative',
] as const

export async function recordAttendance(input: { student_id: string; date: string; status: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your session has expired. Please log in again.')
  }
  if (!(ATTENDANCE_STATUSES as readonly string[]).includes(input.status)) {
    throw new Error('Invalid attendance status.')
  }

  // No DB-level uniqueness on (student_id, date) to rely on for an upsert,
  // so re-marking the same day updates the existing row instead of piling
  // up duplicates. Ordered + limited to 1 rather than .maybeSingle() —
  // that throws on more than one match, and duplicate rows from before
  // this update-in-place logic existed are still floating around.
  const { data: existingRows } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('date', input.date)
    .order('created_at', { ascending: false })
    .limit(1)
  const existing = existingRows?.[0]

  const { error } = existing
    ? await supabase
        .from('attendance')
        .update({ status: input.status, recorded_by: user.id })
        .eq('id', existing.id)
    : await supabase.from('attendance').insert({
        student_id: input.student_id,
        date: input.date,
        status: input.status,
        recorded_by: user.id,
      })

  if (error) {
    throw new Error(error.message)
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

export async function submitMilestoneAssessment(input: {
  student_id: string
  category: string
  assessment_date: string
  notes: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your session has expired. Please log in again.')
  }
  if (!(MILESTONE_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new Error('Invalid milestone category.')
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
        throw new Error(error.message)
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
    throw new Error(error.message)
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
