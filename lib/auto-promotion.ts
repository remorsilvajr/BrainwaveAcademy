import type { SupabaseClient } from '@supabase/supabase-js'
import { wholeMonthsOld } from '@/lib/dob'
import { applyClassroomToStudent } from '@/lib/classroom-assignment'
import { insertNotifications } from '@/lib/notify'
import { logActivity } from '@/lib/activity-log'
import { PROMOTION_LADDER, type LadderClassroom } from '@/lib/promotion'

// Moving a child up automatically once they have outgrown their age-graded class
// (Little Explorers -> Advanced Toddler -> Smart Explorers -> Curious Adventurers).
// Run once a day by the cron route. A move goes through applyClassroomToStudent, so
// the new class's fees are added once per (student, class) and every earlier fee
// stays exactly as it was. Tutorial and Quiz Bee & Competitions aren't on the
// ladder and are never touched; a child who outgrows Curious Adventurers stays
// (graduating is the admin's decision).

// The class to move a child into, or null to leave them where they are. Only when
// the child is past their current class's upper age; then the first class further
// up the ladder that fits their age (a child who fell several classes behind goes
// straight to the right one rather than collecting fees for each class between).
export function autoPromotionTarget<C extends LadderClassroom>(dateOfBirth: string, currentSlug: string | null, ladder: C[], today: string): C | null {
  const index = currentSlug ? PROMOTION_LADDER.indexOf(currentSlug) : -1
  if (index === -1) return null
  const current = ladder.find((c) => c.slug === currentSlug)
  if (!current || current.max_age_months == null) return null
  const months = wholeMonthsOld(dateOfBirth, today)
  if (months <= current.max_age_months) return null
  for (const slug of PROMOTION_LADDER.slice(index + 1)) {
    const next = ladder.find((c) => c.slug === slug)
    if (!next) continue
    if (months >= (next.min_age_months ?? 0) && months <= (next.max_age_months ?? Number.POSITIVE_INFINITY)) return next
  }
  return null
}

export type AutoPromotionSummary = {
  promoted: { studentId: string; from: string; to: string }[]
  errors: string[]
}

export async function runAutoPromotions(deps: {
  // Service-role client (the job has no signed-in user).
  admin: SupabaseClient
  // Manila today. Must be the real today in production: applyClassroomToStudent
  // re-checks the age against it.
  today: string
  // Tests pass their own students so a run never touches real ones.
  studentIds?: string[]
}): Promise<AutoPromotionSummary> {
  const { admin, today } = deps
  const summary: AutoPromotionSummary = { promoted: [], errors: [] }

  const { data: classrooms, error: classroomsError } = await admin
    .from('classrooms')
    .select('id, name, slug, min_age_months, max_age_months')
    .in('slug', [...PROMOTION_LADDER])
  if (classroomsError) {
    summary.errors.push(`classrooms: ${classroomsError.message}`)
    return summary
  }
  const ladder = (classrooms ?? []) as LadderClassroom[]
  if (ladder.length === 0) return summary

  let query = admin
    .from('students')
    .select('id, first_name, last_name, date_of_birth, classroom_id')
    .eq('enrollment_status', 'active')
    .in(
      'classroom_id',
      ladder.map((c) => c.id)
    )
  if (deps.studentIds) query = query.in('id', deps.studentIds.length > 0 ? deps.studentIds : ['00000000-0000-0000-0000-000000000000'])
  const { data: students, error: studentsError } = await query
  if (studentsError) {
    summary.errors.push(`students: ${studentsError.message}`)
    return summary
  }

  for (const student of students ?? []) {
    const current = ladder.find((c) => c.id === student.classroom_id)
    if (!current || !student.date_of_birth) continue
    const target = autoPromotionTarget(student.date_of_birth, current.slug, ladder, today)
    if (!target) continue

    const name = `${student.first_name} ${student.last_name}`
    try {
      await applyClassroomToStudent(admin, student.id, student.date_of_birth, target.id)
    } catch (err) {
      summary.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    summary.promoted.push({ studentId: student.id, from: current.name, to: target.name })

    // Tell the parents, linking to that child's Payments (the parent portal picks
    // the child by application id).
    const [{ data: links }, { data: application }] = await Promise.all([
      admin.from('parent_student').select('parent_id').eq('student_id', student.id),
      admin.from('applications').select('id').eq('created_student_id', student.id).limit(1).maybeSingle(),
    ])
    await insertNotifications(
      admin,
      (links ?? []).map((l) => l.parent_id),
      {
        kind: 'money',
        title: `${student.first_name} moved up to ${target.name}`,
        body: `${name} is now old enough for ${target.name}, so they were moved there from ${current.name} and its fees were added. Earlier fees are unchanged.`,
        href: application ? `/parent/payments?student=${application.id}` : '/parent/payments',
        dedupeKey: `auto-promotion:${student.id}:${target.id}`,
      }
    )
    await logActivity(admin, {
      actorId: null,
      action: `Automatically moved ${name} from ${current.name} to ${target.name} (age) and added its fees`,
      targetTable: 'students',
      targetId: student.id,
    })
  }

  return summary
}
