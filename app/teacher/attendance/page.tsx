import { createClient } from '@/lib/supabase/server'
import { healthAlerts, type HealthAlert } from '@/lib/health'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { RosterCheckin } from '@/components/teacher/roster-checkin'
import { todayIso } from '@/lib/format'
import { attendanceDateFromParam } from '@/lib/date-params'
import { nonDailyClassroomIds } from '@/lib/classrooms'
import { AttendanceRecords } from '@/components/attendance/attendance-records'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { loadStudentAttendanceRecords } from '@/lib/attendance-records'
import { getTeacherAssignedClassrooms } from '@/lib/teacher-classrooms'

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
    supabase.from('attendance').select('student_id, status, arrival_time, departure_time').eq('date', selectedDate),
    supabase.from('classrooms').select('id, name, slug').order('min_age_months', { ascending: true, nullsFirst: false }).order('slug'),
  ])

  // Tutorial and Quiz Bee & Competitions aren't daily, so their students
  // (and those programs in the filter) are left out of the attendance roster.
  // A teacher takes attendance only for the classes they teach (recordAttendance and
  // the database policy enforce the same).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const assignedIds = new Set((await getTeacherAssignedClassrooms(supabase, user?.id ?? '')).map((c) => c.id))
  const nonDaily = nonDailyClassroomIds(classrooms ?? [])
  const rosterStudents = (students ?? []).filter((s) => !!s.classroom_id && assignedIds.has(s.classroom_id) && !nonDaily.has(s.classroom_id))
  const rosterClassrooms = (classrooms ?? []).filter((c) => assignedIds.has(c.id) && !nonDaily.has(c.id))

  // Allergy and medical flags beside each child's name on the list.
  const { data: healthRows } = await supabase.from('student_health').select('student_id, allergies, severe_allergy, medical_conditions, medications')
  const alerts: Record<string, HealthAlert[]> = {}
  for (const h of healthRows ?? []) {
    const list = healthAlerts(h)
    if (list.length > 0) alerts[h.student_id] = list
  }

  const statusByStudent: Record<string, string> = {}
  const timesByStudent: Record<string, { arrival: string | null; departure: string | null }> = {}
  for (const a of attendance ?? []) {
    statusByStudent[a.student_id] = a.status
    timesByStudent[a.student_id] = { arrival: a.arrival_time, departure: a.departure_time }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Attendance</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mark today&apos;s attendance and arrival/departure times for your classes, or look back at a past date.
        </p>
      </div>

      <AttendanceTabLinks basePath="/teacher/attendance" active="checkin" tabs={TABS} />

      <RosterCheckin
        students={rosterStudents}
        classrooms={rosterClassrooms}
        statusByStudent={statusByStudent}
        alerts={alerts}
        timesByStudent={timesByStudent}
        showUnassigned={false}
        emptyMessage={
          assignedIds.size === 0
            ? "You aren't assigned to a class yet. Ask the admin to add you to one in Classrooms."
            : 'No students in your classes yet.'
        }
        date={selectedDate}
        basePath="/teacher/attendance"
        readOnly={selectedDate !== today}
      />
    </div>
  )
}
