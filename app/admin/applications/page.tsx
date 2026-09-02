import { createClient } from '@/lib/supabase/server'
import { ApplicationsTable } from '@/components/admin/applications-table'

export default async function ApplicationsPage() {
  const supabase = await createClient()

  // Only applications already approved via Enrollment Requests belong here —
  // this page is the document-verification step that comes after that, not
  // a second place to see raw enrollment requests (that's Enrollment Requests'
  // job). A pending/rejected enrollment request has no parent account yet,
  // so there's nothing for this page to review.
  const [{ data: applications }, { data: documents }] = await Promise.all([
    supabase
      .from('applications')
      .select('*')
      .eq('status', 'approved')
      .order('submitted_at', { ascending: false }),
    supabase.from('application_documents').select('*'),
  ])

  const docs = documents ?? []
  const appsWithDocs = (applications ?? []).map((app) => ({
    ...app,
    documents: docs.filter((d) => d.application_id === app.id),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Pending Student Applications</h1>
      <ApplicationsTable applications={appsWithDocs} />
    </div>
  )
}
