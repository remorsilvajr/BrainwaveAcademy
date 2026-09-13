import type { SupabaseClient } from '@supabase/supabase-js'

// The classrooms a teacher is actually lead or assistant of — used to
// restrict which classroom a teacher can pick when posting a
// classroom-targeted announcement (see app/teacher/actions.ts for the real
// server-side enforcement; this is what narrows the dropdown to match).
export async function getTeacherAssignedClassrooms(
  supabase: SupabaseClient,
  teacherId: string
): Promise<{ id: string; name: string }[]> {
  const [{ data: leadRows }, { data: assistantLinks }] = await Promise.all([
    supabase.from('classrooms').select('id, name').eq('lead_teacher_id', teacherId),
    supabase.from('classroom_assistants').select('classroom_id').eq('teacher_id', teacherId),
  ])

  const assistantIds = (assistantLinks ?? []).map((a) => a.classroom_id)
  const { data: assistantRows } =
    assistantIds.length > 0 ? await supabase.from('classrooms').select('id, name').in('id', assistantIds) : { data: [] }

  const byId = new Map<string, string>()
  for (const c of leadRows ?? []) byId.set(c.id, c.name)
  for (const c of assistantRows ?? []) byId.set(c.id, c.name)
  return Array.from(byId, ([id, name]) => ({ id, name }))
}
