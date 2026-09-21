import { createClient } from '@/lib/supabase/server'
import { requireSuperAdminPage } from '@/lib/require-super-admin'
import { YearEndReview, type YearEndStudent } from '@/components/admin/year-end-review'
import { ladderClassrooms, PROMOTION_LADDER } from '@/lib/promotion'
import { currentSchoolYear, isValidSchoolYear, schoolYearOptions } from '@/lib/school-year'
import { summarizeOutstanding } from '@/lib/payments'

export default async function AdminYearEndPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireSuperAdminPage()
  const { year: yearParam } = await searchParams
  const schoolYear = yearParam && isValidSchoolYear(yearParam) ? yearParam : currentSchoolYear()

  const supabase = await createClient()
  const [{ data: students }, { data: classrooms }, { data: done }, { data: pendingFees }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id, date_of_birth, classroom_id')
      .eq('enrollment_status', 'active')
      .order('first_name', { ascending: true }),
    supabase.from('classrooms').select('id, name, slug, min_age_months, max_age_months').order('created_at', { ascending: true }),
    supabase.from('student_promotions').select('student_id, action').eq('school_year', schoolYear),
    supabase.from('payments').select('student_id, amount, status, due_date').eq('status', 'pending'),
  ])

  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c]))
  const doneIds = new Set((done ?? []).map((d) => d.student_id))
  const ladder = ladderClassrooms(classrooms ?? [])

  const feesByStudent = new Map<string, { amount: number; status: string; due_date: string | null }[]>()
  for (const fee of pendingFees ?? []) {
    feesByStudent.set(fee.student_id, [...(feesByStudent.get(fee.student_id) ?? []), fee])
  }

  // Students already processed for this school year are left out: the review
  // only ever shows who still needs a decision.
  const rows: YearEndStudent[] = (students ?? [])
    .filter((s) => !doneIds.has(s.id))
    .map((s) => {
      const classroom = s.classroom_id ? classroomById.get(s.classroom_id) : null
      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        studentAccountId: s.student_id,
        date_of_birth: s.date_of_birth,
        classroomId: s.classroom_id,
        classroomName: classroom?.name ?? null,
        classroomSlug: classroom?.slug ?? null,
        outstanding: summarizeOutstanding(feesByStudent.get(s.id) ?? []).outstanding,
      }
    })

  const processed = (done ?? []).reduce(
    (acc, d) => ({ ...acc, [d.action]: (acc[d.action as keyof typeof acc] ?? 0) + 1 }),
    { promoted: 0, stayed: 0, graduated: 0 } as Record<'promoted' | 'stayed' | 'graduated', number>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Year-End Promotion</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Close a school year: move each child up the ladder, keep them where they are, or graduate them. Nothing changes
          until you apply, and each child is handled once per school year.
        </p>
      </div>
      <YearEndReview
        key={schoolYear}
        schoolYear={schoolYear}
        yearOptions={schoolYearOptions()}
        students={rows}
        ladder={ladder.map((c) => ({ id: c.id, name: c.name, slug: c.slug, min_age_months: c.min_age_months, max_age_months: c.max_age_months }))}
        ladderNames={PROMOTION_LADDER.map((slug) => (classrooms ?? []).find((c) => c.slug === slug)?.name ?? slug)}
        processed={processed}
      />
    </div>
  )
}
