import { createClient } from '@/lib/supabase/server'
import { ClassroomsGrid } from '@/components/admin/classrooms-grid'

export default async function ClassroomsPage() {
  const supabase = await createClient()

  const [{ data: classrooms }, { data: teachers }, { data: assistants }, { data: students }] = await Promise.all([
    supabase.from('classrooms').select('*').order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'teacher')
      .order('first_name', { ascending: true }),
    supabase.from('classroom_assistants').select('classroom_id, teacher_id'),
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id, avatar_url, classroom_id, date_of_birth, program_options')
      .not('classroom_id', 'is', null),
  ])

  const teacherOptions = (teachers ?? []).map((t) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))
  const teacherById = new Map(teacherOptions.map((t) => [t.value, t.label]))

  const rows = (classrooms ?? []).map((c) => ({
    ...c,
    leadTeacherName: c.lead_teacher_id ? (teacherById.get(c.lead_teacher_id) ?? 'Unknown teacher') : null,
    assistants: (assistants ?? [])
      .filter((a) => a.classroom_id === c.id)
      .map((a) => ({ id: a.teacher_id, name: teacherById.get(a.teacher_id) ?? 'Unknown teacher' })),
    roster: (students ?? []).filter((s) => s.classroom_id === c.id),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Classrooms</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Assign lead and assistant teachers to each program, manage its fee schedule, and view its students.
          Students are assigned to a classroom from their record in Students.
        </p>
      </div>
      <ClassroomsGrid classrooms={rows} teacherOptions={teacherOptions} />
    </div>
  )
}
