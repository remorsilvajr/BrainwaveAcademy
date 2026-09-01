'use client'

import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  posted_by_name: string
}

export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  const [search, setSearch] = useState('')

  const filtered = announcements.filter((a) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      a.title.toLowerCase().includes(term) ||
      a.body.toLowerCase().includes(term) ||
      a.posted_by_name.toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
          <Megaphone className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No announcements yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check back here for school-wide news and updates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title, message, or author"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="min-h-[360px] space-y-3">
        {pageItems.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.title}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{a.body}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Posted {formatRelativeTime(a.created_at)} by {a.posted_by_name}
              </p>
            </div>
          </div>
        ))}
        {pageItems.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No announcements match your search.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
