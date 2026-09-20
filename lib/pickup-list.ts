import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_STUDENTS } from '@/lib/pickup-constants'

// Shared by /admin/pickup-verification and /teacher/pickup-verification.
// The rows are read through the caller's own RLS-scoped client first
// (staff_view_all_pickups already limits that to teacher/admin) — minting
// signed URLs for their photos via the admin client afterward is just the
// trusted mechanism for a private bucket, not an extra permission check.
// One batched createSignedUrls call rather than one request per photo, since
// the "All Students" view can return every registered pickup person at once.
export async function loadPickupsWithPhotos(supabase: SupabaseClient, studentId: string) {
  let query = supabase
    .from('authorized_pickups')
    .select('id, student_id, full_name, relationship, phone_number, photo_path')
    .order('created_at', { ascending: true })
  if (studentId !== ALL_STUDENTS) query = query.eq('student_id', studentId)

  const { data } = await query
  const rows = data ?? []

  const paths = rows.map((p) => p.photo_path).filter((path): path is string => !!path)
  const urlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await createAdminClient().storage.from('pickup-photos').createSignedUrls(paths, 60 * 5)
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl)
    }
  }

  return rows.map(({ photo_path, ...rest }) => ({
    ...rest,
    photoUrl: photo_path ? (urlByPath.get(photo_path) ?? null) : null,
  }))
}
