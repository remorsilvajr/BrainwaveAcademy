'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { validateFeeDueDate } from '@/lib/classrooms'

// A classroom's teachers are equals (there is no head teacher: the school's
// teachers share the same responsibilities). They are all rows in
// classroom_assistants, a table named before that decision; the older
// classrooms.lead_teacher_id is no longer written, only cleared, and every read
// still unions it in so a classroom set up the old way keeps its teacher.
// admins_manage_classrooms / admins_manage_classroom_assistants (admin-only)
// decide the write; the pre-checks here only turn mistakes into clear messages.

async function getTeacherProfile(supabase: Awaited<ReturnType<typeof createClient>>, teacherId: string) {
  const { data: teacher } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name')
    .eq('id', teacherId)
    .maybeSingle()
  return teacher
}

export async function addClassroomTeacher(classroomId: string, teacherId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const teacher = await getTeacherProfile(supabase, teacherId)
  if (!teacher || teacher.role !== 'teacher') {
    return { error: 'Only teacher accounts can be assigned to a classroom.' }
  }

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name, lead_teacher_id')
    .eq('id', classroomId)
    .single()
  if (!classroom) {
    return { error: 'Classroom not found.' }
  }
  if (classroom.lead_teacher_id === teacherId) {
    return { error: `${teacher.first_name} ${teacher.last_name} already teaches this classroom.` }
  }

  const { error } = await supabase.from('classroom_assistants').insert({ classroom_id: classroomId, teacher_id: teacherId })
  if (error) {
    if (error.code === '23505') {
      return { error: `${teacher.first_name} ${teacher.last_name} already teaches this classroom.` }
    }
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Assigned ${teacher.first_name} ${teacher.last_name} as a teacher of ${classroom.name}`,
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}

export async function removeClassroomTeacher(classroomId: string, teacherId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const [{ error: linkError }, { error: leadError }] = await Promise.all([
    supabase.from('classroom_assistants').delete().eq('classroom_id', classroomId).eq('teacher_id', teacherId),
    // A classroom set up before teachers were equals may still name this teacher here.
    supabase.from('classrooms').update({ lead_teacher_id: null }).eq('id', classroomId).eq('lead_teacher_id', teacherId),
  ])
  const failed = linkError ?? leadError
  if (failed) {
    return { error: failed.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed a teacher from classroom',
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}


// Due dates only: the fee amounts are deliberately not writable from here.
// Only affects students assigned to this classroom *after* the change, and
// never touches fee rows already generated for already-assigned students (see
// the Classrooms note in CLAUDE.md). A date is only range-checked when it's
// being changed, so a stored date that has since drifted into the past doesn't
// block saving the other one.
export async function updateFeeDueDates(
  classroomId: string,
  dates: { tuition_due_date: string | null; activity_due_date: string | null }
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('classrooms')
    .select('tuition_due_date, activity_due_date')
    .eq('id', classroomId)
    .maybeSingle()
  if (!existing) {
    return { error: 'This program could not be found.' }
  }

  const tuition = dates.tuition_due_date || null
  const activity = dates.activity_due_date || null
  for (const [value, stored] of [
    [tuition, existing.tuition_due_date],
    [activity, existing.activity_due_date],
  ] as const) {
    if (value && value !== stored) {
      const message = validateFeeDueDate(value)
      if (message) return { error: message }
    }
  }

  const { data: updated, error } = await supabase
    .from('classrooms')
    .update({ tuition_due_date: tuition, activity_due_date: activity })
    .eq('id', classroomId)
    .select('id')
  if (error) {
    return { error: error.message }
  }
  if (!updated || updated.length === 0) {
    return { error: 'You do not have permission to change this program.' }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated classroom fee due dates',
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}
