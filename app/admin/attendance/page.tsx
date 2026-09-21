import { createClient } from '@/lib/supabase/server'
import { attendanceDateFromParam } from '@/lib/date-params'
import { TeacherAttendanceRoster } from '@/components/admin/teacher-attendance-roster'
import { AttendanceRecords } from '@/components/attendance/attendance-records'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { loadStudentAttendanceRecords, loadTeacherAttendanceRecords } from '@/lib/attendance-records'

const TABS = [
  { key: 'checkin', label: 'Teacher Check-in' },
  { key: 'teachers', label: 'Teacher Records' },
  { key: 'students', label: 'Student Records' },
]

// The admin records attendance for the TEACHERS. Student attendance is recorded by the
// teachers themselves (/teacher/attendance); the admin reads it on the Student Records
// tab, on each student's dashboard and in the Export Report.
export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>
}) {
  const { date: dateParam, tab: tabParam } = await searchParams
  const selectedDate = attendanceDateFromParam(dateParam)

  const supabase = await createClient()

  if (tabParam === 'teachers' || tabParam === 'students') {
    const { rows, capped } = tabParam === 'teachers' ? await loadTeacherAttendanceRecords(supabase) : await loadStudentAttendanceRecords(supabase)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Teacher Attendance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tabParam === 'teachers' ? 'Every teacher attendance record on file.' : 'Every student attendance record on file. Teachers record these.'}
          </p>
        </div>
        <AttendanceTabLinks basePath="/admin/attendance" active={tabParam} tabs={TABS} />
        <AttendanceRecords
          rows={rows}
          subject={tabParam === 'teachers' ? 'teacher' : 'student'}
          groupLabel={tabParam === 'teachers' ? 'Classroom' : 'Program'}
          capped={capped}
        />
      </div>
    )
  }

  const [{ data: teachers }, { data: records }, { data: classrooms }, { data: assistants }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, account_status')
      .eq('role', 'teacher')
      .is('deleted_at', null)
      .order('first_name', { ascending: true }),
    supabase.from('teacher_attendance').select('teacher_id, status').eq('date', selectedDate),
    supabase.from('classrooms').select('id, name, lead_teacher_id').order('created_at', { ascending: true }),
    supabase.from('classroom_assistants').select('classroom_id, teacher_id'),
  ])

  const statusByTeacher: Record<string, string> = {}
  for (const r of records ?? []) statusByTeacher[r.teacher_id] = r.status

  // Who to list: active teachers, plus anyone already marked on this date (so a record for a
  // teacher who has since been deactivated can still be seen and corrected).
  const roster = (teachers ?? []).filter((t) => t.account_status === 'active' || statusByTeacher[t.id])

  // "Lead: Little Explorers" / "Assistant: Advanced Toddler" under each name.
  const classroomName = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const subtitleByTeacher = new Map<string, string[]>()
  const add = (teacherId: string, text: string) => subtitleByTeacher.set(teacherId, [...(subtitleByTeacher.get(teacherId) ?? []), text])
  for (const c of classrooms ?? []) if (c.lead_teacher_id) add(c.lead_teacher_id, `Lead: ${c.name}`)
  for (const a of assistants ?? []) {
    const name = classroomName.get(a.classroom_id)
    if (name) add(a.teacher_id, `Assistant: ${name}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Teacher Attendance</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Record whether each teacher was present, late or absent. You can record or correct any date up to today. Student
          attendance is recorded by the teachers.
        </p>
      </div>

      <AttendanceTabLinks basePath="/admin/attendance" active="checkin" tabs={TABS} />

      <TeacherAttendanceRoster
        teachers={roster.map((t) => ({ id: t.id, first_name: t.first_name, last_name: t.last_name, subtitle: (subtitleByTeacher.get(t.id) ?? []).join(' • ') }))}
        statusByTeacher={statusByTeacher}
        date={selectedDate}
        basePath="/admin/attendance"
      />
    </div>
  )
}
