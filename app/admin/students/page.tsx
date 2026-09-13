import { createClient } from '@/lib/supabase/server'
import { StudentsTable } from '@/components/admin/students-table'

type ParentLink = {
  relationship: string | null
  profiles: { first_name: string; last_name: string; phone_number: string | null; email: string } | null
}

type StudentRow = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
  application_id: string | null
  classroom_id: string | null
  parent_student: ParentLink[] | null
}

export default async function StudentsPage() {
  const supabase = await createClient()

  const [{ data: students }, { data: documents }, { data: classrooms }] = await Promise.all([
    supabase
      .from('students')
      .select('*, parent_student(relationship, profiles(first_name, last_name, phone_number, email))')
      .order('created_at', { ascending: false }),
    supabase.from('application_documents').select('*'),
    supabase
      .from('classrooms')
      .select('id, name, min_age_years, max_age_years')
      .order('created_at', { ascending: true }),
  ])

  const docs = documents ?? []
  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const rows = ((students ?? []) as StudentRow[]).map((s) => ({
    ...s,
    classroomName: s.classroom_id ? (classroomById.get(s.classroom_id) ?? null) : null,
    guardians: (s.parent_student ?? []).map((ps) => ({
      name: `${ps.profiles?.first_name ?? ''} ${ps.profiles?.last_name ?? ''}`.trim(),
      relationship: ps.relationship,
      phone: ps.profiles?.phone_number ?? null,
      email: ps.profiles?.email ?? null,
    })),
    documents: docs.filter((d) => d.application_id === s.application_id),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Directory</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search, inspect, and reference official student records and guardian contact profiles.
        </p>
      </div>
      <StudentsTable students={rows} classrooms={classrooms ?? []} />
    </div>
  )
}
