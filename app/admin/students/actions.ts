'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_AGE } from '@/lib/dob'
import { applyClassroomToStudent } from '@/lib/classroom-assignment'
import { logActivity } from '@/lib/activity-log'

// Returns `{ error }` instead of throwing for every expected failure — this
// is invoked as a plain `await` call from student-record-modal.tsx, not
// through useActionState, so a thrown error's message is redacted by Next
// in a production build (surfaces as minified React error #441). See the
// note in CLAUDE.md under "Auth cookies, sessions, and RLS security model".
export async function updateStudentRecord(
  studentId: string,
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    date_of_birth: string
    gender: string
  }
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const firstName = updates.first_name.trim()
  const lastName = updates.last_name.trim()
  const middleName = updates.middle_name.trim()

  if (!firstName || !lastName || !updates.date_of_birth || !updates.gender) {
    return { error: 'First name, last name, date of birth, and gender are required.' }
  }
  if (!isValidName(firstName) || !isValidName(lastName) || (middleName && !isValidName(middleName))) {
    return { error: NAME_VALIDATION_MESSAGE }
  }
  if (!isValidDob(updates.date_of_birth, { minAge: MIN_STUDENT_AGE, maxAge: MAX_AGE })) {
    return { error: dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_AGE) }
  }

  const { error } = await supabase
    .from('students')
    .update({
      first_name: toTitleCase(firstName),
      middle_name: middleName ? toTitleCase(middleName) : null,
      last_name: toTitleCase(lastName),
      date_of_birth: updates.date_of_birth,
      gender: updates.gender,
    })
    .eq('id', studentId)

  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Edited student record',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
}

// Assigning `null` unassigns the student (e.g. moving them out of a
// classroom entirely) and never touches previously-generated fee rows —
// only assigning a *new* classroom generates fees, and only once per
// (student, classroom) pair, so re-assigning back to a classroom the
// student was already billed for doesn't double-charge them. Age
// eligibility is enforced here, not on the public/parent enroll forms —
// see the Classrooms & fee schedule note in CLAUDE.md for why.
export async function assignStudentClassroom(
  studentId: string,
  classroomId: string | null
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, date_of_birth')
    .eq('id', studentId)
    .single()
  if (!student) {
    return { error: 'Student not found.' }
  }

  if (classroomId === null) {
    const { error } = await supabase.from('students').update({ classroom_id: null }).eq('id', studentId)
    if (error) return { error: error.message }
  } else {
    try {
      await applyClassroomToStudent(supabase, studentId, student.date_of_birth, classroomId)
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not assign that classroom.' }
    }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: classroomId ? 'Assigned student to a classroom' : 'Unassigned student from their classroom',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin/classrooms')
  revalidatePath('/admin/payments')
}

export async function updateStudentAvatar(
  studentId: string,
  formData: FormData
): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please choose an image.' }
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `student-${studentId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('students').update({ avatar_url: avatarUrl }).eq('id', studentId)
  if (updateError) {
    return { error: updateError.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Updated student photo',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin/student-dashboard')
  return { url: avatarUrl }
}

export async function removeStudentAvatar(studentId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.from('students').update({ avatar_url: null }).eq('id', studentId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Removed student photo',
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin/student-dashboard')
}
