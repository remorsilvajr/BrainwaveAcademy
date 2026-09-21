'use client'

import Link from 'next/link'
import { Images, Camera } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { formatAlbumDate, type AlbumFolder } from '@/lib/album'

const FOLDERS_PER_PAGE = 12

// One card per date that has photos. The two offset layers behind the cover are
// just decoration that reads as a small stack of prints. Folders are grouped
// under a month heading; pagination runs over the flat newest-first list, so a
// month can continue onto the next page.
function FolderCard({ folder, href }: { folder: AlbumFolder; href: string }) {
  return (
    <Link
      href={href}
      className="group relative block pb-2 outline-none focus-visible:ring-2 focus-visible:ring-[#e6007e] focus-visible:ring-offset-2 rounded-2xl dark:focus-visible:ring-offset-gray-950"
    >
      <span
        aria-hidden
        className="absolute inset-x-4 top-2 bottom-0 rotate-2 rounded-2xl bg-slate-200 transition-transform group-hover:rotate-3 dark:bg-slate-700/60"
      />
      <span
        aria-hidden
        className="absolute inset-x-3 top-1 bottom-1 -rotate-1 rounded-2xl bg-slate-300 transition-transform group-hover:-rotate-2 dark:bg-slate-600/60"
      />
      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-white/60 bg-[#0b1b62] shadow-md transition group-hover:-translate-y-0.5 group-hover:shadow-xl dark:border-white/10">
        {folder.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset
          <img
            src={folder.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/70">
            <Camera className="h-10 w-10" />
          </span>
        )}
        {folder.isToday && (
          <span className="absolute left-3 top-3 rounded-full bg-[#e6007e] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            Today
          </span>
        )}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Images className="h-3.5 w-3.5" />
          {folder.count}
        </span>

        <span className="absolute inset-x-0 bottom-0 bg-black/55 p-4 text-white">
          <span className="block text-2xl font-extrabold leading-none drop-shadow">
            {formatAlbumDate(folder.date, { month: 'short', day: 'numeric' })}
          </span>
          <span className="mt-1 block text-sm font-medium text-white/85">
            {formatAlbumDate(folder.date, { weekday: 'long', year: 'numeric' })}
          </span>
        </span>
      </span>
    </Link>
  )
}

export function AlbumFolders({ folders, basePath }: { folders: AlbumFolder[]; basePath: string }) {
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(folders, '', FOLDERS_PER_PAGE)

  // Month sections in the order the (newest-first) page items arrive.
  const months: { key: string; folders: AlbumFolder[] }[] = []
  for (const folder of pageItems) {
    const key = folder.date.slice(0, 7)
    const last = months[months.length - 1]
    if (last && last.key === key) last.folders.push(folder)
    else months.push({ key, folders: [folder] })
  }

  return (
    <div className="space-y-8">
      <div className="min-h-[360px] space-y-8">
        {months.map((month) => (
          <section key={month.key}>
            <div className="mb-4 flex items-baseline gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
              <h2 className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300">
                {formatAlbumDate(`${month.key}-01`, { month: 'long', year: 'numeric' })}
              </h2>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {month.folders.length} folder{month.folders.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {month.folders.map((folder) => (
                <FolderCard key={folder.date} folder={folder} href={`${basePath}/${folder.date}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}
