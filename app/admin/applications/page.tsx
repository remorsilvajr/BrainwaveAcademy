import { createClient } from '@/lib/supabase/server'
import { ApplicationsTable } from '@/components/admin/applications-table'

export default async function ApplicationsPage() {
  const supabase = await createClient()

  const [{ data: applications }, { data: documents }] = await Promise.all([
    supabase.from('applications').select('*').order('submitted_at', { ascending: false }),
    supabase.from('application_documents').select('*'),
  ])

  const docs = documents ?? []
  const appsWithDocs = (applications ?? []).map((app) => ({
    ...app,
    documents: docs.filter((d) => d.application_id === app.id),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0b1b62]">Pending Student Applications</h1>
      <ApplicationsTable applications={appsWithDocs} />
    </div>
  )
}
