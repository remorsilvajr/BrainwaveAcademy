import { createClient } from '@/lib/supabase/server'
import { TeacherStudentsTable } from '@/components/teacher/students-table'
import { healthAlerts } from '@/lib/health'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()

  const [{ data: students }, { data: classrooms }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url, classroom_id')
      .order('first_name', { ascending: true }),
    supabase.from('classrooms').select('id, name').order('min_age_months', { ascending: true, nullsFirst: false }).order('slug'),
  ])
  // Allergy and medical flags beside each name (teachers may read every child's health record).
  const { data: healthRows } = await supabase.from('student_health').select('student_id, allergies, severe_allergy, medical_conditions, medications')
  const alertsByStudent = new Map((healthRows ?? []).map((h) => [h.student_id, healthAlerts(h)]))

  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const rows = (students ?? []).map((s) => ({
    ...s,
    classroomName: s.classroom_id ? (classroomById.get(s.classroom_id) ?? null) : null,
    alerts: alertsByStudent.get(s.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Students</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All enrolled students at Brain Wave Academy.</p>
      </div>

      <TeacherStudentsTable students={rows} classrooms={classrooms ?? []} />
    </div>
  )
}
