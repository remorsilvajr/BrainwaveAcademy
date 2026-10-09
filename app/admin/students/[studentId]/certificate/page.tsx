import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadCertificate } from '@/lib/certificate-load'
import { CompletionCertificate } from '@/components/certificate/completion-certificate'

export default async function AdminCertificatePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const supabase = await createClient()
  const data = await loadCertificate(supabase, studentId)
  if (!data) notFound()
  return <CompletionCertificate data={data} backHref="/admin/students" />
}
