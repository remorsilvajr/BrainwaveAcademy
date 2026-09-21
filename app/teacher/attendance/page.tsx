import { createClient } from '@/lib/supabase/server'
import { allergyAlert } from '@/lib/health'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { RosterCheckin } from '@/components/teacher/roster-checkin'
import { todayIso } from '@/lib/format'
import { attendanceDateFromParam } from '@/lib/date-params'
import { nonDailyClassroomIds } from '@/lib/classrooms'
import { AttendanceRecords } from '@/components/attendance/attendance-records'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { loadStudentAttendanceRecords } from '@/lib/attendance-records'

const TABS = [
  { key: 'checkin', label: 'Check-in' },
  { key: 'records', label: 'Records' },
]

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>
}) {
  const { date: dateParam, tab: tabParam } = await searchParams
  const today = todayIso()
  const selectedDate = attendanceDateFromParam(dateParam)

  const supabase = await createClient()

  if (tabParam === 'records') {
    const { rows, capped } = await loadStudentAttendanceRecords(supabase)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Every student attendance record on file.</p>
        </div>
        <AttendanceTabLinks basePath="/teacher/attendance" active="records" tabs={TABS} />
        <AttendanceRecords rows={rows} subject="student" groupLabel="Program" capped={capped} />
      </div>
    )
  }

  const [{ data: students }, { data: attendance }, { data: classrooms }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, classroom_id')
      .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
      .order('first_name', { ascending: true }),
    supabase.from('attendance').select('student_id, status').eq('date', selectedDate),
    supabase.from('classrooms').select('id, name, slug').order('created_at', { ascending: true }),
  ])

  // Tutorial and Quiz Bee & Competitions aren't daily, so their students
  // (and those programs in the filter) are left out of the attendance roster.
  const nonDaily = nonDailyClassroomIds(classrooms ?? [])
  const rosterStudents = (students ?? []).filter((s) => !s.classroom_id || !nonDaily.has(s.classroom_id))
  const rosterClassrooms = (classrooms ?? []).filter((c) => !nonDaily.has(c.id))

  // Severe allergies are flagged beside the child's name on the list.
  const { data: severe } = await supabase.from('student_health').select('student_id, allergies, severe_allergy').eq('severe_allergy', true)
  const alerts: Record<string, string> = {}
  for (const h of severe ?? []) alerts[h.student_id] = allergyAlert(h) ?? 'Severe allergy'

  const statusByStudent: Record<string, string> = {}
  for (const a of attendance ?? []) statusByStudent[a.student_id] = a.status

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Attendance</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mark today&apos;s student attendance, or look back at a past date.</p>
      </div>

      <AttendanceTabLinks basePath="/teacher/attendance" active="checkin" tabs={TABS} />

      <RosterCheckin
        students={rosterStudents}
        classrooms={rosterClassrooms}
        statusByStudent={statusByStudent}
        alerts={alerts}
        date={selectedDate}
        basePath="/teacher/attendance"
        readOnly={selectedDate !== today}
      />
    </div>
  )
}
