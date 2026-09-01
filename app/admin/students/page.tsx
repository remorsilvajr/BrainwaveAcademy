import { createClient } from '@/lib/supabase/server'
import { StudentsTable } from '@/components/admin/students-table'

export default async function StudentsPage() {
  const supabase = await createClient()

  const [{ data: students }, { data: documents }] = await Promise.all([
    supabase
      .from('students')
      .select('*, parent_student(relationship, profiles(first_name, last_name, phone_number, email))')
      .order('created_at', { ascending: false }),
    supabase.from('application_documents').select('*'),
  ])

  const docs = documents ?? []

  const rows = (students ?? []).map((s: any) => ({
    ...s,
    guardians: (s.parent_student ?? []).map((ps: any) => ({
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
      <StudentsTable students={rows} />
    </div>
  )
}
