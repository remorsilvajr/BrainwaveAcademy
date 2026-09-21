import { Users } from 'lucide-react'
import { loadStudentHealth } from '@/lib/health-load'
import { createClient } from '@/lib/supabase/server'
import { StudentDashboardContent } from '@/components/teacher/student-dashboard-content'
import { tracksDailyAttendance } from '@/lib/classrooms'
import { StudentSelector } from '@/components/teacher/student-selector'
import { EmptyState } from '@/components/ui/empty-state'

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
    .select('id, first_name, last_name, classroom_id')
    .order('first_name', { ascending: true })
  const classroomsQuery = supabase.from('classrooms').select('id, name, slug').order('created_at', { ascending: true })

  function detailQueries(id: string) {
    return Promise.all([
      supabase
        .from('students')
        .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url, classroom_id')
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

  let students, student, attendance, milestones, classrooms
  let selectedId: string | null

  if (studentParam) {
    selectedId = studentParam
    const [studentsRes, classroomsRes, [studentRes, attendanceRes, milestonesRes]] = await Promise.all([
      studentsQuery,
      classroomsQuery,
      detailQueries(studentParam),
    ])
    ;({ data: students } = studentsRes)
    ;({ data: classrooms } = classroomsRes)
    ;({ data: student } = studentRes)
    ;({ data: attendance } = attendanceRes)
    ;({ data: milestones } = milestonesRes)
  } else {
    ;[{ data: students }, { data: classrooms }] = await Promise.all([studentsQuery, classroomsQuery])
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

  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const healthData = await loadStudentHealth(supabase, selectedId)

  if (!selectedId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Attendance, assessments, and milestones per student.</p>
        </div>
        <EmptyState
          icon={Users}
          title="No Students on File Yet"
          description="Once students are enrolled, you'll be able to pick one here to mark attendance and record milestone assessments."
          action={{ href: '/teacher/students', label: 'View Students' }}
        />
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
        <StudentSelector students={students ?? []} classrooms={classrooms ?? []} selectedId={selectedId} />
      </div>

      {student && (
        <StudentDashboardContent
          health={healthData}
          student={{ ...student, classroomName: student.classroom_id ? (classroomById.get(student.classroom_id) ?? null) : null }}
          attendance={attendance ?? []}
          attendanceTracked={tracksDailyAttendance((classrooms ?? []).find((c) => c.id === student.classroom_id))}
          milestones={milestones ?? []}
        />
      )}
    </div>
  )
}
