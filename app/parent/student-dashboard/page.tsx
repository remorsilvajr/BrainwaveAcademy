import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StudentDashboardContent } from '@/components/teacher/student-dashboard-content'

export default async function ParentStudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Matches app/parent/layout.tsx's selector: `student` in the URL is an
  // applications.id, not a students.id — the same application id the
  // top bar's student switcher already uses everywhere else in the parent
  // portal, so it stays in sync when you switch children from any page.
  const { data: applications } = await supabase
    .from('applications')
    .select('id, student_first_name, student_last_name, created_student_id')
    .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
    .order('submitted_at', { ascending: true })

  const application =
    (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Attendance, assessments, and development milestones for your child.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No students on file yet.{' '}
          <Link href="/parent/enroll-a-student" className="font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            Enroll a student
          </Link>{' '}
          to get started.
        </div>
      </div>
    )
  }

  // Attendance/milestones only exist once the application has become a
  // real students row (post document-review, see /admin/applications) —
  // before that there's nothing to track yet.
  if (!application.created_student_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Attendance, assessments, and development milestones for your child.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {application.student_first_name} {application.student_last_name} isn&apos;t enrolled yet — attendance
          and milestone tracking begin once enrollment is complete.{' '}
          <Link href="/parent/enrollment-status" className="font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            Check Enrollment Status
          </Link>
        </div>
      </div>
    )
  }

  const studentId = application.created_student_id

  const [{ data: student }, { data: attendance }, { data: milestones }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url')
      .eq('id', studentId)
      .single(),
    supabase
      .from('attendance')
      .select('id, date, status')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .limit(14),
    supabase
      .from('milestones')
      .select('id, category, assessment_date, notes')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Attendance, assessments, and development milestones for your child.
        </p>
      </div>

      {student && (
        <StudentDashboardContent
          student={student}
          attendance={attendance ?? []}
          milestones={milestones ?? []}
          readOnly
        />
      )}
    </div>
  )
}
