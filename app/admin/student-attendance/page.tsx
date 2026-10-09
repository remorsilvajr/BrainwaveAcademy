import { createClient } from '@/lib/supabase/server'
import { attendanceDateFromParam } from '@/lib/date-params'
import { isToday } from '@/lib/format'
import { tracksDailyAttendance } from '@/lib/classrooms'
import { allergyAlert } from '@/lib/health'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { AttendanceRecords } from '@/components/attendance/attendance-records'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { DateSelector } from '@/components/teacher/date-selector'
import { StudentAttendanceDay, type DayClass } from '@/components/admin/student-attendance-day'
import { loadStudentAttendanceRecords } from '@/lib/attendance-records'

const TABS = [
  { key: 'day', label: 'By Day' },
  { key: 'records', label: 'Records' },
]

// Admin's read-only view of student attendance. Teachers record it (today only,
// see recordAttendance); this shows any day up to today per class, and every
// record on file.
export default async function AdminStudentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>
}) {
  const { date: dateParam, tab: tabParam } = await searchParams
  const tab = tabParam === 'records' ? 'records' : 'day'
  const supabase = await createClient()

  const heading = (
    <div>
      <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Attendance</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {tab === 'records'
          ? 'Every student attendance record on file. Teachers record these.'
          : 'Who was present, late or absent, per class. Teachers record attendance; this view is read-only.'}
      </p>
    </div>
  )

  if (tab === 'records') {
    const { rows, capped } = await loadStudentAttendanceRecords(supabase)
    return (
      <div className="space-y-6">
        {heading}
        <AttendanceTabLinks basePath="/admin/student-attendance" active="records" tabs={TABS} />
        <AttendanceRecords rows={rows} subject="student" groupLabel="Program" capped={capped} />
      </div>
    )
  }

  const selectedDate = attendanceDateFromParam(dateParam)
  const [{ data: classrooms }, { data: students }, { data: records }, { data: health }] = await Promise.all([
    supabase.from('classrooms').select('id, name, slug').order('min_age_months', { ascending: true, nullsFirst: false }).order('slug'),
    supabase
      .from('students')
      .select('id, first_name, last_name, classroom_id')
      .not('classroom_id', 'is', null)
      .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
      .order('first_name', { ascending: true }),
    supabase.from('attendance').select('student_id, status').eq('date', selectedDate),
    supabase.from('student_health').select('student_id, allergies, severe_allergy'),
  ])

  const statusByStudent = new Map((records ?? []).map((r) => [r.student_id, r.status]))
  const allergyByStudent = new Map((health ?? []).map((h) => [h.student_id, allergyAlert(h)]))
  const classes: DayClass[] = (classrooms ?? [])
    .filter((c) => tracksDailyAttendance(c))
    .map((c) => ({
      id: c.id,
      name: c.name,
      students: (students ?? [])
        .filter((s) => s.classroom_id === c.id)
        .map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          status: (statusByStudent.get(s.id) ?? null) as DayClass['students'][number]['status'],
          allergy: allergyByStudent.get(s.id) ?? null,
        })),
    }))

  return (
    <div className="space-y-6">
      {heading}
      <AttendanceTabLinks basePath="/admin/student-attendance" active="day" tabs={TABS} />
      <DateSelector date={selectedDate} basePath="/admin/student-attendance" />
      <StudentAttendanceDay classes={classes} isToday={isToday(selectedDate)} />
    </div>
  )
}
