import type { SupabaseClient } from '@supabase/supabase-js'

// A classroom-targeted announcement should only reach a parent whose own
// linked child is actually in that classroom — this resolves the distinct
// set of classroom ids across every child linked to a parent, for exactly
// that filter. Two plain queries (not an embedded join) to keep this
// simple and avoid PostgREST embedding/typing quirks for a lookup this small.
export async function getParentClassroomIds(supabase: SupabaseClient, parentId: string): Promise<string[]> {
  const { data: links } = await supabase.from('parent_student').select('student_id').eq('parent_id', parentId)
  const studentIds = (links ?? []).map((l) => l.student_id)
  if (studentIds.length === 0) return []

  const { data: students } = await supabase.from('students').select('classroom_id').in('id', studentIds)
  const ids = new Set<string>()
  for (const s of students ?? []) {
    if (s.classroom_id) ids.add(s.classroom_id)
  }
  return Array.from(ids)
}

// An announcement with a null classroom_id is unscoped (visible regardless
// of classroom, matching every announcement's behavior before classroom
// targeting existed) — only a *set* classroom_id restricts visibility, and
// only to parents with a child actually in it.
export function classroomVisibilityFilter(classroomIds: string[]): string {
  if (classroomIds.length === 0) return 'classroom_id.is.null'
  return `classroom_id.is.null,classroom_id.in.(${classroomIds.join(',')})`
}
