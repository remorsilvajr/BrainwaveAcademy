import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIso } from '@/lib/format'
import type { CertificateData } from '@/components/certificate/completion-certificate'

// What's printed on the Certificate of Completion, or null if the child hasn't
// completed preschool. `client` must be able to read student_promotions (admin's
// own client, or the service role after the caller's access was checked).
const PROGRAM_TITLES: Record<string, string> = {
  'curious-adventurers': 'Curious Adventurers (Pre-Kindergarten)',
}

export async function loadCertificate(client: SupabaseClient, studentId: string): Promise<CertificateData | null> {
  const { data: student } = await client
    .from('students')
    .select('first_name, middle_name, last_name, enrollment_status, classroom_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student || student.enrollment_status !== 'graduated') return null

  const { data: record } = await client
    .from('student_promotions')
    .select('created_at, from_classroom_id')
    .eq('student_id', studentId)
    .eq('action', 'graduated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const classroomId = record?.from_classroom_id ?? student.classroom_id
  const { data: classroom } = classroomId
    ? await client.from('classrooms').select('name, slug').eq('id', classroomId).maybeSingle()
    : { data: null }

  return {
    studentName: [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' '),
    programName: classroom ? (PROGRAM_TITLES[classroom.slug] ?? classroom.name) : 'Preschool',
    completedOn: record?.created_at ?? todayIso(),
  }
}
