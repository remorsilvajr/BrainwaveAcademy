import type { SupabaseClient } from '@supabase/supabase-js'
import { remainingBalance } from '@/lib/payments'
import { roundToCents, todayIso } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertNotifications } from '@/lib/notify'
import { logActivity } from '@/lib/activity-log'
import { FINAL_CLASS_SLUG, hasOutgrownFinalClass } from '@/lib/completion-rules'
import { currentSchoolYear } from '@/lib/school-year'

// Completing preschool: a child who has outgrown the last age-graded class
// (Curious Adventurers, Pre-Kindergarten) has finished here. The UI says
// "Completed Preschool" / "Certificate of Completion"; the stored status is
// still 'graduated' (lib/student-status.ts), so existing filters keep working.
//
// While any fee is still owed the child is "Pending Completion": nothing is
// stored for that, it is worked out from age + class + balance, and they stay a
// normal active student. The moment the balance is zero (the daily job, or right
// after a payment/waive/void/delete) they become completed, a student_promotions
// row ('graduated') records the date for the certificate, and the parents are
// told. An admin can also complete a Curious Adventurers child by hand (still
// only with nothing owed).

export type CompletionResult =
  | { status: 'completed' }
  | { status: 'pending'; owed: number }
  | { status: 'not-eligible'; reason: string }

export async function owedBy(admin: SupabaseClient, studentId: string): Promise<number> {
  const { data } = await admin.from('payments').select('amount, amount_paid').eq('student_id', studentId).eq('status', 'pending')
  return roundToCents((data ?? []).reduce((sum, row) => sum + remainingBalance(row), 0))
}

// `admin` must be the service-role client (it writes the student's status and the
// student_promotions row, which only an admin may otherwise touch). `manual`:
// the admin pressed Complete Preschool, so the age check is skipped (still only
// for a child in the final class).
export async function completeStudentIfReady(
  admin: SupabaseClient,
  studentId: string,
  opts: { today: string; manual?: boolean; actorId?: string | null }
): Promise<CompletionResult> {
  const { data: student } = await admin
    .from('students')
    .select('id, first_name, last_name, date_of_birth, classroom_id, enrollment_status')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { status: 'not-eligible', reason: 'Student not found.' }
  if (student.enrollment_status !== 'active') return { status: 'not-eligible', reason: 'Only a currently enrolled student can complete preschool.' }

  const { data: classroom } = student.classroom_id
    ? await admin.from('classrooms').select('id, name, slug, max_age_months').eq('id', student.classroom_id).maybeSingle()
    : { data: null }
  if (!classroom || classroom.slug !== FINAL_CLASS_SLUG) {
    return { status: 'not-eligible', reason: 'Only a student in Curious Adventurers can complete preschool.' }
  }
  if (!opts.manual && !hasOutgrownFinalClass(student.date_of_birth, classroom, opts.today)) {
    return { status: 'not-eligible', reason: 'Not old enough to finish Curious Adventurers yet.' }
  }

  const owed = await owedBy(admin, studentId)
  if (owed > 0) return { status: 'pending', owed }

  // Guarded on 'active' so two runs at once can't both complete (and notify) them.
  const { data: updated, error } = await admin
    .from('students')
    .update({ enrollment_status: 'graduated' })
    .eq('id', studentId)
    .eq('enrollment_status', 'active')
    .select('id')
  if (error) throw new Error(error.message)
  if (!updated || updated.length === 0) return { status: 'not-eligible', reason: 'Already completed.' }

  await admin.from('student_promotions').upsert(
    {
      student_id: studentId,
      school_year: currentSchoolYear(opts.today),
      action: 'graduated',
      from_classroom_id: classroom.id,
      to_classroom_id: null,
      created_by: opts.actorId ?? null,
    },
    { onConflict: 'student_id,school_year', ignoreDuplicates: true }
  )

  const name = `${student.first_name} ${student.last_name}`
  const [{ data: links }, { data: application }] = await Promise.all([
    admin.from('parent_student').select('parent_id').eq('student_id', studentId),
    admin.from('applications').select('id').eq('created_student_id', studentId).limit(1).maybeSingle(),
  ])
  await insertNotifications(
    admin,
    (links ?? []).map((l) => l.parent_id),
    {
      kind: 'message',
      title: `${student.first_name} has completed preschool`,
      body: `Congratulations! ${name} has finished ${classroom.name}. The Certificate of Completion is ready to print or save.`,
      href: application ? `/parent/students/certificate?student=${application.id}` : '/parent/students',
      dedupeKey: `completion:${studentId}`,
    }
  )
  await logActivity(admin, {
    actorId: opts.actorId ?? null,
    action: `${name} completed preschool (${classroom.name})${opts.manual ? '' : ', automatically once of age with nothing owed'}`,
    targetTable: 'students',
    targetId: studentId,
  })
  return { status: 'completed' }
}

// The daily job's pass: every active Curious Adventurers child past the age.
export async function runCompletions(deps: { admin: SupabaseClient; today: string; studentIds?: string[] }) {
  const summary = { completed: [] as string[], pending: [] as { studentId: string; owed: number }[], errors: [] as string[] }
  const { data: finalClass } = await deps.admin.from('classrooms').select('id, slug, max_age_months').eq('slug', FINAL_CLASS_SLUG).maybeSingle()
  if (!finalClass) return summary

  let query = deps.admin.from('students').select('id, date_of_birth').eq('enrollment_status', 'active').eq('classroom_id', finalClass.id)
  if (deps.studentIds) query = query.in('id', deps.studentIds.length > 0 ? deps.studentIds : ['00000000-0000-0000-0000-000000000000'])
  const { data: students, error } = await query
  if (error) {
    summary.errors.push(error.message)
    return summary
  }
  for (const s of students ?? []) {
    if (!s.date_of_birth || !hasOutgrownFinalClass(s.date_of_birth, finalClass, deps.today)) continue
    try {
      const r = await completeStudentIfReady(deps.admin, s.id, { today: deps.today })
      if (r.status === 'completed') summary.completed.push(s.id)
      else if (r.status === 'pending') summary.pending.push({ studentId: s.id, owed: r.owed })
    } catch (err) {
      summary.errors.push(`${s.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return summary
}

// Called right after anything that lowers what a child owes (a payment, waive,
// void, edit, delete), so they complete the moment the balance reaches zero
// instead of at the next daily run. Best effort: never fails the payment.
export async function completeIfReadyAfterBalanceChange(studentId: string | null | undefined): Promise<void> {
  if (!studentId) return
  try {
    await completeStudentIfReady(createAdminClient(), studentId, { today: todayIso() })
  } catch (err) {
    console.error('completion check after a balance change failed:', err)
  }
}
