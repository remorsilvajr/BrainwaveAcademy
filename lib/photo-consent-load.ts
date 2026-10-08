import type { SupabaseClient } from '@supabase/supabase-js'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { mayAppearInClassPhotos } from '@/lib/photo-consent'

export type NoConsentChild = { id: string; name: string; avatarUrl: string | null; answered: boolean }

// For the teacher's upload panel: per classroom, the enrolled children who must
// be kept out of class photos (a parent said no, or hasn't answered yet).
export async function loadNoPhotoConsentByClassroom(
  supabase: SupabaseClient,
  classroomIds: string[]
): Promise<Record<string, NoConsentChild[]>> {
  if (classroomIds.length === 0) return {}
  const { data } = await supabase
    .from('students')
    .select('id, first_name, last_name, avatar_url, classroom_id, photo_consent')
    .in('classroom_id', classroomIds)
    .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
    .order('first_name', { ascending: true })
  const byClassroom: Record<string, NoConsentChild[]> = {}
  for (const s of data ?? []) {
    if (mayAppearInClassPhotos(s.photo_consent)) continue
    ;(byClassroom[s.classroom_id] ??= []).push({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      avatarUrl: s.avatar_url,
      answered: s.photo_consent !== null,
    })
  }
  return byClassroom
}

export type ChildConsent = { id: string; name: string; consent: boolean | null }

// A parent's still-enrolled children and their current answer (RLS limits the
// rows to their own children).
export async function loadParentChildrenConsent(supabase: SupabaseClient, parentId: string): Promise<ChildConsent[]> {
  const { data: links } = await supabase.from('parent_student').select('student_id').eq('parent_id', parentId)
  const ids = (links ?? []).map((l) => l.student_id)
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('students')
    .select('id, first_name, last_name, photo_consent')
    .in('id', ids)
    .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
    .order('first_name', { ascending: true })
  return (data ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, consent: s.photo_consent }))
}
