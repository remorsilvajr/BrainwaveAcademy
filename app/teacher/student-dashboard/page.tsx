import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StudentDashboardContent } from '@/components/teacher/student-dashboard-content'
import { StudentSelector } from '@/components/teacher/student-selector'

export default async function TeacherStudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()

  // See app/admin/student-dashboard/page.tsx for why this branches on
  // studentParam — the student list is only needed up front to pick a
  // *default* selection when the URL has none yet; every other entry into
  // this page already supplies one, so this avoids serializing two DB
  // round trips into one when a single Promise.all would do.
  const studentsQuery = supabase
    .from('students')
    .select('id, first_name, last_name')
    .order('first_name', { ascending: true })

  function detailQueries(id: string) {
    return Promise.all([
      supabase
        .from('students')
        .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url')
        .eq('id', id)
        .single(),
      supabase
        .from('attendance')
        .select('id, date, status')
        .eq('student_id', id)
        .order('date', { ascending: false })
        .limit(14),
      supabase
        .from('milestones')
        .select('id, category, assessment_date, notes')
        .eq('student_id', id)
        .order('assessment_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
  }

  let students, student, attendance, milestones
  let selectedId: string | null

  if (studentParam) {
    selectedId = studentParam
    const [studentsRes, [studentRes, attendanceRes, milestonesRes]] = await Promise.all([
      studentsQuery,
      detailQueries(studentParam),
    ])
    ;({ data: students } = studentsRes)
    ;({ data: student } = studentRes)
    ;({ data: attendance } = attendanceRes)
    ;({ data: milestones } = milestonesRes)
  } else {
    ;({ data: students } = await studentsQuery)
    selectedId = students?.[0]?.id ?? null
    if (selectedId) {
      const [studentRes, attendanceRes, milestonesRes] = await detailQueries(selectedId)
      ;({ data: student } = studentRes)
      ;({ data: attendance } = attendanceRes)
      ;({ data: milestones } = milestonesRes)
    } else {
      student = null
      attendance = null
      milestones = null
    }
  }

  if (!selectedId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Attendance, assessments, and milestones per student.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No students on file yet.{' '}
          <Link href="/teacher/students" className="font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            View Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Attendance, assessments, and milestones per student.</p>
        </div>
        <StudentSelector students={students ?? []} selectedId={selectedId} />
      </div>

      {student && (
        <StudentDashboardContent
          student={student}
          attendance={attendance ?? []}
          milestones={milestones ?? []}
        />
      )}
    </div>
  )
}
