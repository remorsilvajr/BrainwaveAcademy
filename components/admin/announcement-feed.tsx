'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Trash2 } from 'lucide-react'
import { postAnnouncement, deleteAnnouncement } from '@/app/admin/announcement/actions'
import { formatRelativeTime } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type Announcement = {
  id: string
  title: string
  body: string
  target_role: string
  created_at: string
  posted_by_name: string
}

const targetLabels: Record<string, string> = {
  parent: 'Parents',
  teacher: 'Teachers',
  all: 'Everyone',
}

const targetBadgeClasses: Record<string, string> = {
  parent: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/30 text-pink-700',
  all: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
}

export function AnnouncementFeed({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter()
  const [isPosting, setIsPosting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  async function handlePost() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await postAnnouncement({ title, body, target_role: targetRole })
      setTitle('')
      setBody('')
      setTargetRole('all')
      setIsPosting(false)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteAnnouncement(id)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">All Announcements</h2>
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
            placeholder="Write a message…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Target Audience</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">Everyone</option>
              <option value="parent">Parents Only</option>
              <option value="teacher">Teachers Only</option>
            </select>
          </div>
          {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
          <button
            type="button"
            onClick={handlePost}
            disabled={isSubmitting}
            className="rounded-lg bg-[#e6007e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
          >
            {isSubmitting ? 'Posting…' : 'Post Announcement'}
          </button>
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title, message, or author"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 min-h-[360px] space-y-3">
        {pageItems.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30 text-[#e6007e]">
                <Megaphone className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${targetBadgeClasses[a.target_role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {targetLabels[a.target_role] ?? a.target_role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{a.body}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Posted {formatRelativeTime(a.created_at)} by {a.posted_by_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(a.id)}
              disabled={deletingId === a.id}
              aria-label="Delete announcement"
              className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-600 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {pageItems.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {announcements.length === 0 ? 'No announcements posted yet.' : 'No announcements match your search.'}
          </p>
        )}
      </div>

      <div className="-mx-6 -mb-6 mt-4">
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
