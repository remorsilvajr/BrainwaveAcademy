import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Pickup Verification is a front-desk page that tends to stay open all day, so
// photo links live for an hour rather than minutes. PickupAvatar also falls
// back to the placeholder icon if a link has expired anyway.
export const PICKUP_PHOTO_URL_TTL_SECONDS = 60 * 60

// Shared by /admin/pickup-verification and /teacher/pickup-verification.
// The rows are read through the caller's own RLS-scoped client first
// (staff_view_all_pickups already limits that to teacher/admin) — minting
// signed URLs for their photos via the admin client afterward is just the
// trusted mechanism for a private bucket, not an extra permission check.
// One batched createSignedUrls call rather than one request per photo, since
// this returns every registered pickup person school-wide.
export async function loadAllPickupsWithPhotos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('authorized_pickups')
    .select('id, student_id, full_name, relationship, phone_number, photo_path')
    .order('created_at', { ascending: true })
  const rows = data ?? []

  const paths = rows.map((p) => p.photo_path).filter((path): path is string => !!path)
  const urlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await createAdminClient().storage.from('pickup-photos').createSignedUrls(paths, PICKUP_PHOTO_URL_TTL_SECONDS)
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl)
    }
  }

  return rows.map(({ photo_path, ...rest }) => ({
    ...rest,
    photoUrl: photo_path ? (urlByPath.get(photo_path) ?? null) : null,
  }))
}
