'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { validateFeeDueDate } from '@/lib/classrooms'

// All four teacher-assignment actions below rely on admins_manage_classrooms
// / admins_manage_classroom_assistants (both `for all`, admin-only) for the
// actual write permission — same "trust RLS, don't duplicate the check"
// pattern as updateStudentRecord/updateTeacherRecord. Each still does its
// own friendly pre-checks (role, duplicate, lead-vs-assistant conflict)
// so a real mistake surfaces as a clear message rather than a raw
// unique-constraint/permission error.

async function getTeacherProfile(supabase: Awaited<ReturnType<typeof createClient>>, teacherId: string) {
  const { data: teacher } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name')
    .eq('id', teacherId)
    .maybeSingle()
  return teacher
}

export async function assignLeadTeacher(classroomId: string, teacherId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const teacher = await getTeacherProfile(supabase, teacherId)
  if (!teacher || teacher.role !== 'teacher') {
    return { error: 'Only teacher accounts can be assigned as a lead teacher.' }
  }

  const { data: classroom } = await supabase.from('classrooms').select('id, name').eq('id', classroomId).single()
  if (!classroom) {
    return { error: 'Classroom not found.' }
  }

  const { data: existingLead } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('lead_teacher_id', teacherId)
    .neq('id', classroomId)
    .maybeSingle()
  if (existingLead) {
    return { error: `${teacher.first_name} ${teacher.last_name} is already the lead teacher of ${existingLead.name}.` }
  }

  const { data: alreadyAssistant } = await supabase
    .from('classroom_assistants')
    .select('classroom_id')
    .eq('classroom_id', classroomId)
    .eq('teacher_id', teacherId)
    .maybeSingle()
  if (alreadyAssistant) {
    return {
      error: `${teacher.first_name} ${teacher.last_name} is already an assistant teacher in this classroom. Remove them as an assistant first.`,
    }
  }

  const { error } = await supabase.from('classrooms').update({ lead_teacher_id: teacherId }).eq('id', classroomId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Assigned ${teacher.first_name} ${teacher.last_name} as lead teacher of ${classroom.name}`,
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}

export async function removeLeadTeacher(classroomId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.from('classrooms').update({ lead_teacher_id: null }).eq('id', classroomId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed lead teacher from classroom',
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}

export async function addAssistantTeacher(classroomId: string, teacherId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const teacher = await getTeacherProfile(supabase, teacherId)
  if (!teacher || teacher.role !== 'teacher') {
    return { error: 'Only teacher accounts can be assigned as an assistant teacher.' }
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
    return { error: `${teacher.first_name} ${teacher.last_name} is already the lead teacher of this classroom.` }
  }

  const { error } = await supabase.from('classroom_assistants').insert({ classroom_id: classroomId, teacher_id: teacherId })
  if (error) {
    if (error.code === '23505') {
      return { error: `${teacher.first_name} ${teacher.last_name} is already an assistant teacher in this classroom.` }
    }
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Added ${teacher.first_name} ${teacher.last_name} as an assistant teacher in ${classroom.name}`,
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}

export async function removeAssistantTeacher(classroomId: string, teacherId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('classroom_assistants')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('teacher_id', teacherId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed an assistant teacher from classroom',
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
