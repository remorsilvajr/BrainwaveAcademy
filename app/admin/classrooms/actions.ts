'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { FEE_SCHEDULE_EDITABLE } from '@/lib/classrooms'

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

// Only affects students assigned to this classroom *after* the change —
// see the Classrooms & fee schedule note in CLAUDE.md for why this
// deliberately never touches fee rows already generated for
// already-assigned students.
export async function updateFeeSchedule(
  classroomId: string,
  updates: {
    tuition_fee: number
    activity_fee: number
    tuition_due_date: string | null
    activity_due_date: string | null
  }
): Promise<{ error: string } | undefined> {
  if (!FEE_SCHEDULE_EDITABLE) {
    return { error: 'Program fees and due dates are locked and cannot be changed right now.' }
  }

  const supabase = await createClient()

  if (updates.tuition_fee < 0 || updates.activity_fee < 0) {
    return { error: 'Fee amounts cannot be negative.' }
  }

  const { error } = await supabase
    .from('classrooms')
    .update({
      tuition_fee: updates.tuition_fee,
      activity_fee: updates.activity_fee,
      tuition_due_date: updates.tuition_due_date || null,
      activity_due_date: updates.activity_due_date || null,
    })
    .eq('id', classroomId)

  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated classroom fee schedule',
    targetTable: 'classrooms',
    targetId: classroomId,
  })

  revalidatePath('/admin/classrooms')
}
