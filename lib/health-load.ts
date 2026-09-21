import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmergencyContact, StudentHealth } from '@/lib/health'

// One child's health record and emergency contacts, read through the caller's own
// RLS-scoped client (a parent only gets their own child's, teachers and admin any).
// A read error yields "nothing on file" instead of breaking the page.
export async function loadStudentHealth(
  supabase: SupabaseClient,
  studentId: string | null
): Promise<{ health: StudentHealth | null; contacts: EmergencyContact[] }> {
  if (!studentId) return { health: null, contacts: [] }
  const [{ data: health }, { data: contacts }] = await Promise.all([
    supabase.from('student_health').select('*').eq('student_id', studentId).maybeSingle(),
    supabase.from('emergency_contacts').select('position, full_name, relationship, phone_number').eq('student_id', studentId),
  ])
  return { health: (health as StudentHealth | null) ?? null, contacts: (contacts as EmergencyContact[] | null) ?? [] }
}
