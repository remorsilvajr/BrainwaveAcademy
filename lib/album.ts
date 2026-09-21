import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRealIsoDate } from '@/lib/dob'
import { todayIso } from '@/lib/format'

// The daily photo album. A "folder" isn't a stored thing: it's just the set of
// photos sharing an `album_date`, so a date with no photos has no folder and one
// appears the moment a teacher uploads into it. `album_date` is set by the
// database (today in Manila) and pinned by RLS, so an upload always lands in
// today's folder and nothing can be backdated.
export const ALBUM_BUCKET = 'album-photos'
export const ALBUM_MAX_PHOTOS_PER_UPLOAD = 20
const ALBUM_URL_TTL_SECONDS = 60 * 60

export type AlbumFolder = {
  date: string
  count: number
  coverUrl: string | null
  isToday: boolean
}

export type AlbumPhoto = {
  id: string
  url: string
  classroomName: string | null
  createdAt: string
  // Teacher: their own uploads. Admin: everything. Parent: never.
  canDelete: boolean
}

// A real, non-future YYYY-MM-DD from a URL segment, else null (the page 404s).
export function albumDateFromParam(value: string): string | null {
  return isRealIsoDate(value) && value <= todayIso() ? value : null
}

// "Monday", "September 21, 2026" etc. from a plain YYYY-MM-DD. Formatted in UTC
// on purpose: the string is a calendar date, not a moment, so the runtime's
// timezone must not shift it by a day.
export function formatAlbumDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options })
}

// Signed URLs are minted with the service-role client because the bucket is
// private and has no SELECT policy. That's safe here: the rows the paths came
// from were just read through the caller's own RLS-scoped client, which is what
// decides who may see a photo (parents only get photos meant for them).
async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const urlByPath = new Map<string, string>()
  if (paths.length === 0) return urlByPath
  const { data } = await createAdminClient().storage.from(ALBUM_BUCKET).createSignedUrls(paths, ALBUM_URL_TTL_SECONDS)
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl)
  }
  return urlByPath
}

// Every date that has at least one photo the caller may see, newest first, with
// the first photo of each as its cover.
export async function loadAlbumFolders(supabase: SupabaseClient): Promise<AlbumFolder[]> {
  const { data, error } = await supabase
    .from('album_photos')
    .select('album_date, storage_path')
    .order('album_date', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) {
    console.error(`Album folders query failed: ${error.message}`)
    return []
  }

  const byDate = new Map<string, { count: number; coverPath: string }>()
  for (const row of data ?? []) {
    const entry = byDate.get(row.album_date)
    if (entry) entry.count += 1
    else byDate.set(row.album_date, { count: 1, coverPath: row.storage_path })
  }

  const urls = await signPaths([...byDate.values()].map((e) => e.coverPath))
  const today = todayIso()
  return [...byDate.entries()].map(([date, entry]) => ({
    date,
    count: entry.count,
    coverUrl: urls.get(entry.coverPath) ?? null,
    isToday: date === today,
  }))
}

export async function loadAlbumPhotos(
  supabase: SupabaseClient,
  date: string,
  viewer: { userId: string; role: string }
): Promise<AlbumPhoto[]> {
  const { data, error } = await supabase
    .from('album_photos')
    .select('id, storage_path, uploaded_by, classroom_id, created_at')
    .eq('album_date', date)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) {
    console.error(`Album photos query failed: ${error.message}`)
    return []
  }
  const rows = data ?? []

  const classroomIds = [...new Set(rows.map((r) => r.classroom_id).filter((id): id is string => !!id))]
  const { data: classrooms } =
    classroomIds.length > 0 ? await supabase.from('classrooms').select('id, name').in('id', classroomIds) : { data: [] }
  const classroomNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const urls = await signPaths(rows.map((r) => r.storage_path))
  return rows.flatMap((r) => {
    const url = urls.get(r.storage_path)
    if (!url) return []
    return [
      {
        id: r.id,
        url,
        classroomName: r.classroom_id ? (classroomNameById.get(r.classroom_id) ?? null) : null,
        createdAt: r.created_at,
        canDelete: viewer.role === 'admin' || (viewer.role === 'teacher' && r.uploaded_by === viewer.userId),
      },
    ]
  })
}
