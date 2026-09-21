import type { SupabaseClient } from '@supabase/supabase-js'
import { isAgeEligibleForClassroom, classroomAgeRangeLabel } from '@/lib/classrooms'
import { isHourlyProgram, validateProgramOptions } from '@/lib/program-options'

// Shared by assignStudentClassroom (admin/students/actions.ts, assigning an
// existing student from the Student Record modal) and
// approveAndCreateStudentRecord (admin/applications/actions.ts, applying a
// parent's requested program at the moment the student record is created) —
// same age-eligibility check, same classroom_id write, same
// generate-fees-once-per-(student,classroom) behavior in both places.
export async function applyClassroomToStudent(
  supabase: SupabaseClient,
  studentId: string,
  dateOfBirth: string,
  classroomId: string,
  // The named options inside a Tutorial / Quiz Bee style program. Ignored (and
  // stored as none) for every other program; required (at least one) for those.
  programOptions: string[] = []
): Promise<{ classroomName: string }> {
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name, slug, min_age_months, max_age_months, tuition_fee, activity_fee, tuition_due_date, activity_due_date')
    .eq('id', classroomId)
    .single()

  if (!classroom) {
    throw new Error('Classroom not found.')
  }

  if (!isAgeEligibleForClassroom(dateOfBirth, classroom)) {
    throw new Error(
      `This student's age doesn't fall within ${classroom.name}'s allowed range (${classroomAgeRangeLabel(classroom)}).`
    )
  }

  const checkedOptions = validateProgramOptions(classroom.slug, programOptions)
  if (!checkedOptions.ok) {
    throw new Error(checkedOptions.error)
  }

  const { error: assignError } = await supabase
    .from('students')
    .update({ classroom_id: classroomId, program_options: checkedOptions.options })
    .eq('id', studentId)
  if (assignError) throw new Error(assignError.message)

  // Hourly programs (Tutorial, Quiz Bee & Competitions) are billed by the hours
  // actually taken, so no fixed tuition/activity fee is generated for them;
  // admin records those payments with Record Manual Payment.
  if (isHourlyProgram(classroom.slug)) {
    return { classroomName: classroom.name }
  }

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

  return { classroomName: classroom.name }
}
