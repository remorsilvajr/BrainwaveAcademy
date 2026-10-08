import { Users } from 'lucide-react'
import { loadStudentHealth } from '@/lib/health-load'
import { createClient } from '@/lib/supabase/server'
import { StudentDashboardContent } from '@/components/teacher/student-dashboard-content'
import { tracksDailyAttendance } from '@/lib/classrooms'
import { StudentSelector, StudentSwitchArea, StudentSwitchProvider } from '@/components/teacher/student-selector'
import { EmptyState } from '@/components/ui/empty-state'

export default async function TeacherStudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; class?: string }>
}) {
  const { student: studentParam, class: classParam = '' } = await searchParams
  const supabase = await createClient()

  // Same shape as app/admin/student-dashboard/page.tsx: with ?student= the list
  // and the student's details (health included) load in one round trip.
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
      supabase.from('attendance').select('id, date, status').eq('student_id', id).order('date', { ascending: false }).limit(14),
      supabase
        .from('milestones')
        .select('id, category, assessment_date, notes')
        .eq('student_id', id)
        .order('assessment_date', { ascending: false })
        .order('created_at', { ascending: false }),
      loadStudentHealth(supabase, id),
    ])
  }

  let students, classrooms, details
  let selectedId: string | null
  if (studentParam) {
    selectedId = studentParam
    ;[{ data: students }, { data: classrooms }, details] = await Promise.all([studentsQuery, classroomsQuery, detailQueries(studentParam)])
  } else {
    ;[{ data: students }, { data: classrooms }] = await Promise.all([studentsQuery, classroomsQuery])
    const pool = classParam ? (students ?? []).filter((s) => s.classroom_id === classParam) : (students ?? [])
    selectedId = pool[0]?.id ?? null
    details = selectedId ? await detailQueries(selectedId) : null
  }
  const [studentRes, attendanceRes, milestonesRes, healthData] = details ?? [null, null, null, null]
  const student = studentRes?.data ?? null
  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const heading = (
    <div>
      <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Attendance, assessments, and milestones per student.</p>
    </div>
  )

  if ((students ?? []).length === 0) {
    return (
      <div className="space-y-6">
        {heading}
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
    <StudentSwitchProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {heading}
          <StudentSelector students={students ?? []} classrooms={classrooms ?? []} selectedId={selectedId ?? ''} selectedClassId={classParam} />
        </div>

        <StudentSwitchArea>
          {student ? (
            <StudentDashboardContent
              health={healthData!}
              student={{ ...student, classroomName: student.classroom_id ? (classroomById.get(student.classroom_id) ?? null) : null }}
              attendance={attendanceRes?.data ?? []}
              attendanceTracked={tracksDailyAttendance((classrooms ?? []).find((c) => c.id === student.classroom_id))}
              milestones={milestonesRes?.data ?? []}
            />
          ) : (
            <EmptyState icon={Users} title="No Students in This Class" description="Pick another class, or All classes." />
          )}
        </StudentSwitchArea>
      </div>
    </StudentSwitchProvider>
  )
}
