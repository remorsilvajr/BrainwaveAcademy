import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Images } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { AlbumFolders } from '@/components/album/album-folders'
import { FolderView } from '@/components/album/folder-view'
import { UploadPanel } from '@/components/album/upload-panel'
import { albumDateFromParam, formatAlbumDate, loadAlbumFolders, loadAlbumPhotos } from '@/lib/album'
import { getTeacherAssignedClassrooms } from '@/lib/teacher-classrooms'
import { todayIso } from '@/lib/format'

type AlbumRole = 'parent' | 'teacher' | 'admin'

const subtitles: Record<AlbumRole, string> = {
  parent: "Photos your child's teachers have shared, one folder for each day.",
  teacher: "Share the day's photos with parents. Each day's photos live in a folder named for that date.",
  admin: 'Every photo teachers have shared, one folder for each day. You can remove any photo.',
}

// The album index and a single day's folder, shared by all three portals so the
// design lives in one place. Who may see which photo is decided by RLS on
// `album_photos`, not here: every query below runs as the signed-in user.
export async function AlbumIndexPage({ role }: { role: AlbumRole }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [folders, classrooms] = await Promise.all([
    loadAlbumFolders(supabase),
    role === 'teacher' && user ? getTeacherAssignedClassrooms(supabase, user.id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Photo Album</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitles[role]}</p>
      </div>

      {role === 'teacher' && <UploadPanel classrooms={classrooms} />}

      {folders.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No Photos Yet"
          description={
            role === 'teacher'
              ? "Photos you add will appear here, in a folder for each day. A day only gets a folder once you've uploaded photos to it."
              : role === 'parent'
                ? "When a teacher shares photos, they'll show up here in a folder for that day."
                : 'Once a teacher shares photos, each day gets its own folder here.'
          }
        />
      ) : (
        <AlbumFolders folders={folders} basePath={`/${role}/album`} />
      )}
    </div>
  )
}

export async function AlbumFolderPage({ role, date: dateParam }: { role: AlbumRole; date: string }) {
  const date = albumDateFromParam(dateParam)
  if (!date) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const photos = await loadAlbumPhotos(supabase, date, { userId: user?.id ?? '', role })

  const backHref = `/${role}/album`
  const isToday = date === todayIso()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1b62] via-[#3b2a8f] to-[#e6007e] p-6 text-white shadow-md">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          All folders
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-white/80">
              {formatAlbumDate(date, { weekday: 'long' })}
            </p>
            <h1 className="text-3xl font-extrabold">{formatAlbumDate(date, { month: 'long', day: 'numeric', year: 'numeric' })}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#e6007e]">Today</span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
              <Images className="h-4 w-4" />
              {photos.length} photo{photos.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No Photos In This Folder"
          description="There are no photos for this day. A folder only exists while it has photos."
          action={{ href: backHref, label: 'Back to the Album' }}
        />
      ) : (
        <FolderView photos={photos} />
      )}
    </div>
  )
}
