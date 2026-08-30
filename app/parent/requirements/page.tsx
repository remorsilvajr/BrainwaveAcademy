import { createClient } from '@/lib/supabase/server'
import { RequirementsChecklist } from '@/components/parent/requirements-checklist'

export default async function RequirementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Looked up via applications.created_parent_id rather than through a
  // student record — the student doesn't exist yet at this stage, since
  // it's only created after documents are uploaded and verified.
  const { data: applications } = await supabase
    .from('applications')
    .select('id, student_first_name, student_last_name')
    .eq('created_parent_id', user?.id ?? '')

  const applicationIds = (applications ?? []).map((a) => a.id)

  const { data: documents } =
    applicationIds.length > 0
      ? await supabase.from('application_documents').select('*').in('application_id', applicationIds)
      : { data: [] }

  const records = (applications ?? []).map((a) => ({
    applicationId: a.id,
    studentFirstName: a.student_first_name,
    studentLastName: a.student_last_name,
    documents: (documents ?? []).filter((d) => d.application_id === a.id),
  }))

  return (
    <div>
      <RequirementsChecklist records={records} />
    </div>
  )
}
