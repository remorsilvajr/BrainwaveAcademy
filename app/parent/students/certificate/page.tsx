import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parentApplicationsFilter } from '@/lib/parent-applications'
import { withStudent } from '@/lib/parent-links'
import { loadCertificate } from '@/lib/certificate-load'
import { CompletionCertificate } from '@/components/certificate/completion-certificate'

// `?student=` is the application id, like every per-child parent page.
export default async function ParentCertificatePage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: applications } = await supabase
    .from('applications')
    .select('id, created_student_id')
    .eq('hidden_from_parent', false)
    .or(parentApplicationsFilter(user))
  const application = (applications ?? []).find((a) => a.id === studentParam) ?? null
  if (!application?.created_student_id) notFound()

  // The parent's own client proves the child is theirs (students RLS); the
  // completion date lives in student_promotions, which only admins can read, so
  // the rest is read with the service role after that check.
  const { data: own } = await supabase.from('students').select('id').eq('id', application.created_student_id).maybeSingle()
  if (!own) notFound()
  const data = await loadCertificate(createAdminClient(), own.id)
  if (!data) notFound()
  return <CompletionCertificate data={data} backHref={withStudent('/parent/students', studentParam)} />
}
