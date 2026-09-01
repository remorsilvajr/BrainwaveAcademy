'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { postAnnouncement } from '@/app/teacher/actions'
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

export function ClassroomAnnouncements({
  announcements,
  viewAllHref,
}: {
  announcements: Announcement[]
  viewAllHref?: string
}) {
  const router = useRouter()
  const [isPosting, setIsPosting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  // The dashboard widget (viewAllHref set, capped at 5 by the caller's own
  // query) stays a simple recent-5 list — search/pagination only kick in on
  // the full /teacher/announcement page, which renders this with no
  // viewAllHref.
  const isFullList = !viewAllHref

  const filtered = isFullList
    ? announcements.filter((a) => {
        if (!search.trim()) return true
        const term = search.toLowerCase()
        return (
          a.title.toLowerCase().includes(term) ||
          a.body.toLowerCase().includes(term) ||
          a.posted_by_name.toLowerCase().includes(term)
        )
      })
    : announcements

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)
  const displayed = isFullList ? pageItems : announcements

  async function handlePost() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await postAnnouncement({ title, body })
      setTitle('')
      setBody('')
      setIsPosting(false)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Classroom Announcements</h2>
        <button
          type="button"
          onClick={() => setIsPosting((v) => !v)}
          className="text-sm font-semibold text-[#e6007e] hover:underline"
        >
          {isPosting ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {isPosting && (
        <div className="mt-4 space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message for parents…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
          {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
          <button
            type="button"
            onClick={handlePost}
            disabled={isSubmitting}
            className="rounded-lg bg-[#e6007e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
          >
            {isSubmitting ? 'Posting…' : 'Post to Parents'}
          </button>
        </div>
      )}

      {isFullList && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, message, or author"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
        </div>
      )}

      <div className={`mt-4 space-y-3 ${isFullList ? 'min-h-[360px]' : ''}`}>
        {displayed.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30 text-[#e6007e]">
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
        {displayed.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {announcements.length === 0 ? 'No announcements posted yet.' : 'No announcements match your search.'}
          </p>
        )}
      </div>

      {isFullList && (
        <div className="-mx-6 -mb-6 mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="mt-4 inline-block text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
        >
          View All →
        </Link>
      )}
    </div>
  )
}
