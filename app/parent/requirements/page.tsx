import { createClient } from '@/lib/supabase/server'
import { RequirementsChecklist } from '@/components/parent/requirements-checklist'

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Looked up via applications.created_parent_id rather than through a
  // student record — the student doesn't exist yet at this stage, since
  // it's only created after documents are uploaded and verified. This is
  // deliberately narrower than the top bar's own selector (see
  // app/parent/layout.tsx) — document upload genuinely shouldn't be
  // possible before admin approves the enrollment request itself, so a
  // pending (not yet created_parent_id-linked) child correctly has nothing
  // to show here.
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

  // Selection now comes from the shared top bar (see app/parent/layout.tsx),
  // not an internal dropdown — this page used to have its own independent
  // selector, which could show a different child than whatever the top bar
  // displayed as selected. When the URL has no explicit ?student=, the top
  // bar's own default is the first application from its *broader* list
  // (matching by parent_email too, not just created_parent_id) — so this
  // page has to resolve that same default here rather than falling back to
  // the first item in its own narrower eligible-only list, or the two could
  // silently disagree on which child is "selected" with nothing to show it.
  let effectiveStudentParam = studentParam
  if (!effectiveStudentParam) {
    const { data: broaderDefault } = await supabase
      .from('applications')
      .select('id')
      .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
      .order('submitted_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    effectiveStudentParam = broaderDefault?.id
  }

  const record = records.find((r) => r.applicationId === effectiveStudentParam) ?? null
  const isEligibleStudentSelectedElsewhere = !!effectiveStudentParam && !record

  return (
    <div>
      <RequirementsChecklist
        record={record}
        selectedElsewhereNotEligible={!!isEligibleStudentSelectedElsewhere}
      />
    </div>
  )
}
