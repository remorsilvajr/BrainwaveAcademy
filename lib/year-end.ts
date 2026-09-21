import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activity-log'
import { applyClassroomToStudent } from '@/lib/classroom-assignment'
import { CHOICE_GRADUATE, CHOICE_STAY, PROMOTION_LADDER } from '@/lib/promotion'
import { isValidSchoolYear } from '@/lib/school-year'
import { isTerminalStudentStatus } from '@/lib/student-status'

const MAX_DECISIONS = 1000

export type YearEndDecision = { studentId: string; choice: string }

export type YearEndResult = {
  promoted: number
  stayed: number
  graduated: number
  skipped: number
  failed: { name: string; error: string }[]
}

// Applies the whole review at once. Each student is handled on their own: one
// child's problem (say, no longer age-eligible) is reported and the rest still
// go through. A student is processed at most once per school year, enforced by
// a unique (student_id, school_year) row in student_promotions, so re-running or
// double-submitting the review can't move anyone twice. Returns `{ error }`
// instead of throwing for anything expected (a thrown Server Function error is
// redacted in a production build).
export async function applyYearEndDecisions(
  supabase: SupabaseClient,
  adminId: string,
  schoolYear: string,
  decisions: YearEndDecision[]
): Promise<{ error: string } | YearEndResult> {
  if (!isValidSchoolYear(schoolYear)) {
    return { error: 'Choose a valid school year.' }
  }
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return { error: 'There is nothing to apply.' }
  }
  if (decisions.length > MAX_DECISIONS) {
    return { error: `Apply at most ${MAX_DECISIONS} students at a time.` }
  }
  if (new Set(decisions.map((d) => d.studentId)).size !== decisions.length) {
    return { error: 'A student appears more than once.' }
  }

  const { data: classrooms } = await supabase.from('classrooms').select('id, slug')
  const ladderById = new Map(
    (classrooms ?? []).filter((c) => PROMOTION_LADDER.includes(c.slug)).map((c) => [c.id, c])
  )

  const studentIds = decisions.map((d) => d.studentId)
  const [{ data: students }, { data: already }] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name, date_of_birth, enrollment_status, classroom_id').in('id', studentIds),
    supabase.from('student_promotions').select('student_id').eq('school_year', schoolYear).in('student_id', studentIds),
  ])
  const studentById = new Map((students ?? []).map((s) => [s.id, s]))
  const alreadyDone = new Set((already ?? []).map((a) => a.student_id))

  const result: YearEndResult = { promoted: 0, stayed: 0, graduated: 0, skipped: 0, failed: [] }

  for (const decision of decisions) {
    const student = studentById.get(decision.studentId)
    if (!student) {
      result.failed.push({ name: 'Unknown student', error: 'Student not found.' })
      continue
    }
    const name = `${student.first_name} ${student.last_name}`

    if (alreadyDone.has(student.id)) {
      result.skipped += 1
      continue
    }
    if (student.enrollment_status !== 'active' || isTerminalStudentStatus(student.enrollment_status)) {
      result.failed.push({ name, error: 'Not currently enrolled.' })
      continue
    }

    const fromClassroomId = student.classroom_id
    let action: 'promoted' | 'stayed' | 'graduated'
    let toClassroomId: string | null = fromClassroomId

    try {
      if (decision.choice === CHOICE_STAY) {
        action = 'stayed'
      } else if (decision.choice === CHOICE_GRADUATE) {
        // Graduating keeps the classroom on record as their last program and
        // takes them out of rosters, attendance and the album like a withdrawal.
        const { error } = await supabase.from('students').update({ enrollment_status: 'graduated' }).eq('id', student.id)
        if (error) throw new Error(error.message)
        action = 'graduated'
      } else if (ladderById.has(decision.choice)) {
        // Same age check, classroom write and new-program fee generation as
        // assigning a program from the Student Record; old fees stay as history.
        await applyClassroomToStudent(supabase, student.id, student.date_of_birth, decision.choice)
        action = 'promoted'
        toClassroomId = decision.choice
      } else {
        throw new Error('That is not a program children can be promoted into.')
      }

      const { error: historyError } = await supabase.from('student_promotions').insert({
        student_id: student.id,
        school_year: schoolYear,
        action,
        from_classroom_id: fromClassroomId,
        to_classroom_id: action === 'graduated' ? fromClassroomId : toClassroomId,
        created_by: adminId,
      })
      if (historyError) {
        // The change above is already applied, so say so plainly.
        throw new Error(`Applied, but the history entry could not be saved: ${historyError.message}`)
      }

      if (action === 'promoted') result.promoted += 1
      else if (action === 'stayed') result.stayed += 1
      else result.graduated += 1
    } catch (err) {
      result.failed.push({ name, error: err instanceof Error ? err.message : 'Something went wrong.' })
    }
  }

  const applied = result.promoted + result.stayed + result.graduated
  if (applied > 0) {
    await logActivity(supabase, {
      actorId: adminId,
      action: `Applied the ${schoolYear} year-end review: ${result.promoted} promoted, ${result.stayed} stayed, ${result.graduated} graduated`,
      targetTable: 'students',
    })
  }

  return result
}
