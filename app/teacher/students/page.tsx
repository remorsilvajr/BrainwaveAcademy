import { createClient } from '@/lib/supabase/server'
import { TeacherStudentsTable } from '@/components/teacher/students-table'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url')
    .order('first_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Students</h1>
        <p className="mt-1 text-sm text-gray-500">All enrolled students at Brainwave Academy.</p>
      </div>

      <TeacherStudentsTable students={students ?? []} />
    </div>
  )
}
