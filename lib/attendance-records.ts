import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceRecordRow } from '@/components/attendance/attendance-records'

// The Records tab of the Attendance pages loads the most recent records and filters
// them in the browser (search, status, program, date range). One over the cap is asked
// for so the page can say when older records were left out.
export const ATTENDANCE_RECORD_LIMIT = 5000

const isStatus = (value: string): value is AttendanceRecordRow['status'] => value === 'present' || value === 'late' || value === 'absent'

// Every student's attendance (a withdrawn or graduated child's history is kept, so it is
// included). Names come from separate queries, not an embed, so a second foreign key on
// either table can never silently blank them.
export async function loadStudentAttendanceRecords(supabase: SupabaseClient) {
  const [{ data: attendance }, { data: students }, { data: classrooms }] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, student_id, date, status')
      .order('date', { ascending: false })
      .limit(ATTENDANCE_RECORD_LIMIT + 1),
    supabase.from('students').select('id, first_name, last_name, classroom_id'),
    supabase.from('classrooms').select('id, name'),
  ])

  const studentById = new Map((students ?? []).map((s) => [s.id, s]))
  const classroomName = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const all = attendance ?? []
  const rows: AttendanceRecordRow[] = all
    .slice(0, ATTENDANCE_RECORD_LIMIT)
    .filter((a) => isStatus(a.status))
    .map((a) => {
      const student = studentById.get(a.student_id)
      return {
        id: a.id,
        date: a.date,
        name: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
        status: a.status,
        group: (student?.classroom_id && classroomName.get(student.classroom_id)) || '',
      }
    })
  return { rows, capped: all.length > ATTENDANCE_RECORD_LIMIT }
}

// Every teacher's attendance, with the classrooms they lead or assist as the group.
export async function loadTeacherAttendanceRecords(supabase: SupabaseClient) {
  const [{ data: attendance }, { data: teachers }, { data: classrooms }, { data: assistants }] = await Promise.all([
    supabase
      .from('teacher_attendance')
      .select('id, teacher_id, date, status')
      .order('date', { ascending: false })
      .limit(ATTENDANCE_RECORD_LIMIT + 1),
    supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher'),
    supabase.from('classrooms').select('id, name, lead_teacher_id'),
    supabase.from('classroom_assistants').select('classroom_id, teacher_id'),
  ])

  const teacherById = new Map((teachers ?? []).map((t) => [t.id, t]))
  const classroomName = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const groupsByTeacher = new Map<string, string[]>()
  const add = (teacherId: string, name: string) => groupsByTeacher.set(teacherId, [...(groupsByTeacher.get(teacherId) ?? []), name])
  for (const c of classrooms ?? []) if (c.lead_teacher_id) add(c.lead_teacher_id, c.name)
  for (const a of assistants ?? []) {
    const name = classroomName.get(a.classroom_id)
    if (name) add(a.teacher_id, name)
  }

  const all = attendance ?? []
  const rows: AttendanceRecordRow[] = all
    .slice(0, ATTENDANCE_RECORD_LIMIT)
    .filter((a) => isStatus(a.status))
    .map((a) => {
      const teacher = teacherById.get(a.teacher_id)
      return {
        id: a.id,
        date: a.date,
        name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown teacher',
        status: a.status,
        group: (groupsByTeacher.get(a.teacher_id) ?? []).join(', '),
      }
    })
  return { rows, capped: all.length > ATTENDANCE_RECORD_LIMIT }
}
