import { createClient } from '@/lib/supabase/server'
import { RequirementsChecklist } from '@/components/parent/requirements-checklist'

export default async function RequirementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: links } = await supabase
    .from('parent_student')
    .select('student:students(id, first_name, last_name, application_id)')
    .eq('parent_id', user?.id ?? '')

  const students = (links ?? [])
    .map((l: any) => l.student)
    .filter(Boolean)

  const applicationIds = students.map((s: any) => s.application_id).filter(Boolean)

  const { data: documents } =
    applicationIds.length > 0
      ? await supabase.from('application_documents').select('*').in('application_id', applicationIds)
      : { data: [] }

  const studentsWithDocs = students.map((s: any) => ({
    ...s,
    documents: (documents ?? []).filter((d) => d.application_id === s.application_id),
  }))

  return (
    <div>
      <RequirementsChecklist students={studentsWithDocs} />
    </div>
  )
}
