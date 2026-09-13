'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidDob, dobRangeMessage, MIN_STUDENT_AGE, MAX_AGE } from '@/lib/dob'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { logActivity } from '@/lib/activity-log'

export async function updateStudentRecord(
  studentId: string,
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    date_of_birth: string
    gender: string
  }
) {
  const supabase = await createClient()

  const firstName = updates.first_name.trim()
  const lastName = updates.last_name.trim()
  const middleName = updates.middle_name.trim()

  if (!firstName || !lastName || !updates.date_of_birth || !updates.gender) {
    throw new Error('First name, last name, date of birth, and gender are required.')
  }
  if (!isValidName(firstName) || !isValidName(lastName) || (middleName && !isValidName(middleName))) {
    throw new Error(NAME_VALIDATION_MESSAGE)
  }
  if (!isValidDob(updates.date_of_birth, { minAge: MIN_STUDENT_AGE, maxAge: MAX_AGE })) {
    throw new Error(dobRangeMessage('Student', MIN_STUDENT_AGE, MAX_AGE))
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
    throw new Error(error.message)
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
export async function assignStudentClassroom(studentId: string, classroomId: string | null) {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, date_of_birth')
    .eq('id', studentId)
    .single()
  if (!student) {
    throw new Error('Student not found.')
  }

  if (classroomId === null) {
    const { error } = await supabase.from('students').update({ classroom_id: null }).eq('id', studentId)
    if (error) throw new Error(error.message)
  } else {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, name, min_age_years, max_age_years, tuition_fee, activity_fee, tuition_due_date, activity_due_date')
      .eq('id', classroomId)
      .single()
    if (!classroom) {
      throw new Error('Classroom not found.')
    }

    if (!isAgeEligibleForClassroom(student.date_of_birth, classroom)) {
      throw new Error(
        `This student's age doesn't fall within ${classroom.name}'s allowed range (${classroom.min_age_years}-${classroom.max_age_years} years old).`
      )
    }

    const { error: assignError } = await supabase.from('students').update({ classroom_id: classroomId }).eq('id', studentId)
    if (assignError) throw new Error(assignError.message)

    const { data: existingFees } = await supabase
      .from('payments')
      .select('id')
      .eq('student_id', studentId)
      .eq('classroom_id', classroomId)

    if (!existingFees || existingFees.length === 0) {
      const feeRows = []
      if (classroom.tuition_fee > 0) {
        feeRows.push({
          student_id: studentId,
          classroom_id: classroomId,
          fee_type: 'tuition',
          description: `${classroom.name}: Tuition`,
          amount: classroom.tuition_fee,
          due_date: classroom.tuition_due_date,
          status: 'pending',
        })
      }
      if (classroom.activity_fee > 0) {
        feeRows.push({
          student_id: studentId,
          classroom_id: classroomId,
          fee_type: 'activity',
          description: `${classroom.name}: Activity Fee`,
          amount: classroom.activity_fee,
          due_date: classroom.activity_due_date,
          status: 'pending',
        })
      }
      if (feeRows.length > 0) {
        const { error: feeError } = await supabase.from('payments').insert(feeRows)
        if (feeError) throw new Error(feeError.message)
      }
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

export async function updateStudentAvatar(studentId: string, formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    throw new Error('Please choose an image.')
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const path = `student-${studentId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('students').update({ avatar_url: avatarUrl }).eq('id', studentId)
  if (updateError) {
    throw new Error(updateError.message)
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
  return avatarUrl
}

export async function removeStudentAvatar(studentId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('students').update({ avatar_url: null }).eq('id', studentId)
  if (error) {
    throw new Error(error.message)
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
