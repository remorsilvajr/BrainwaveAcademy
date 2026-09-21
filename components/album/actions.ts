'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { getTeacherAssignedClassrooms } from '@/lib/teacher-classrooms'
import { ALBUM_BUCKET, ALBUM_MAX_PHOTOS_PER_UPLOAD } from '@/lib/album'

// Shared by all three portals (like components/feedback/actions.ts), so it isn't
// colocated with one route. Both actions return `{ error }` instead of throwing:
// a thrown Server Function error is redacted in a production build.

function revalidateAlbum() {
  for (const role of ['parent', 'teacher', 'admin']) revalidatePath(`/${role}/album`, 'layout')
}

// The browser uploads each (already resized) photo straight to Storage, because
// a Server Action body is capped at 4.5MB on Vercel, then calls this to record
// them. The folder date isn't an argument: the database sets it to today in
// Manila and RLS pins it, so an upload can only ever land in today's folder.
export async function recordAlbumPhotos(
  paths: string[],
  classroomId: string
): Promise<{ error: string } | { count: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') {
    return { error: 'Only teachers can add photos to the album.' }
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    return { error: 'Choose at least one photo.' }
  }
  if (paths.length > ALBUM_MAX_PHOTOS_PER_UPLOAD) {
    return { error: `You can add up to ${ALBUM_MAX_PHOTOS_PER_UPLOAD} photos at a time.` }
  }
  // A path is only ever this teacher's own folder plus a UUID filename, so a
  // caller can't point a row at someone else's file or an arbitrary object.
  const pathPattern = new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp)$`)
  if (!paths.every((p) => typeof p === 'string' && pathPattern.test(p)) || new Set(paths).size !== paths.length) {
    return { error: 'One of the photos could not be added. Please try again.' }
  }

  // Every photo belongs to exactly one class, and a parent only ever sees the
  // classes their own (active) child is in, so a photo can't go to "everyone".
  // A teacher can only pick a classroom they lead or assist, the same rule as
  // classroom announcements (also enforced by the insert policy).
  if (!classroomId) {
    return { error: 'Choose which class these photos are for.' }
  }
  const assigned = await getTeacherAssignedClassrooms(supabase, user.id)
  if (!assigned.some((c) => c.id === classroomId)) {
    return { error: "You can only share photos with a classroom you're assigned to." }
  }

  const { error } = await supabase
    .from('album_photos')
    .insert(paths.map((storage_path) => ({ storage_path, uploaded_by: user.id, classroom_id: classroomId })))
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Added ${paths.length} photo${paths.length === 1 ? '' : 's'} to the album`,
    targetTable: 'album_photos',
  })

  revalidateAlbum()
  return { count: paths.length }
}

// The row is deleted through the caller's own client, so RLS decides who may
// (a teacher their own, an admin any); only then is the file removed with the
// service-role client, which is just cleanup of an already-authorized delete.
export async function deleteAlbumPhoto(photoId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const { data: deleted, error } = await supabase.from('album_photos').delete().eq('id', photoId).select('storage_path')
  if (error) {
    return { error: error.message }
  }
  if (!deleted || deleted.length === 0) {
    return { error: "You can't delete this photo." }
  }

  await createAdminClient().storage.from(ALBUM_BUCKET).remove(deleted.map((d) => d.storage_path))

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Deleted a photo from the album',
    targetTable: 'album_photos',
    targetId: photoId,
  })

  revalidateAlbum()
}
