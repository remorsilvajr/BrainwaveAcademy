'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ImageIcon } from 'lucide-react'
import { resolveFeedback, reopenFeedback } from '@/app/admin/actions'
import { getFeedbackImageUrl } from '@/app/admin/feedback/actions'
import { formatDateLong, formatRelativeTime } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal'

type FeedbackItem = {
  id: string
  subject: string
  message: string
  resolved: boolean
  created_at: string
  image_path: string | null
  submitter_name: string
  submitter_email: string | null
  submitter_role: string | null
}

type Tab = 'all' | 'unresolved' | 'resolved'

const roleBadgeClasses: Record<string, string> = {
  parent: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
  admin: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
}

// Card-list rows, not a <table> — this app's convention for content that's
// mostly free-text prose (ClassroomAnnouncements, RequirementsChecklist)
// rather than short fixed-width fields, since a bug report's message body
// doesn't read well crammed into a table cell.
export function FeedbackTable({ items }: { items: FeedbackItem[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('unresolved')
  const [search, setSearch] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null)

  const counts = {
    all: items.length,
    unresolved: items.filter((f) => !f.resolved).length,
    resolved: items.filter((f) => f.resolved).length,
  }

  const tabItems = tab === 'all' ? items : items.filter((f) => (tab === 'resolved' ? f.resolved : !f.resolved))

  const filtered = tabItems.filter((f) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      f.subject.toLowerCase().includes(term) ||
      f.message.toLowerCase().includes(term) ||
      f.submitter_name.toLowerCase().includes(term) ||
      (f.submitter_email ?? '').toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, `${tab}|${search}`)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'unresolved', label: 'Unresolved', count: counts.unresolved },
    { key: 'resolved', label: 'Resolved', count: counts.resolved },
    { key: 'all', label: 'All', count: counts.all },
  ]

  async function handleViewImage(item: FeedbackItem) {
    if (!item.image_path) return
    setLoadingImageId(item.id)
    setErrorMessage('')
    try {
      const url = await getFeedbackImageUrl(item.image_path)
      setPreviewUrl(url)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load the screenshot.')
    } finally {
      setLoadingImageId(null)
    }
  }

  async function handleToggle(item: FeedbackItem) {
    setWorkingId(item.id)
    setErrorMessage('')
    try {
      if (item.resolved) {
        await reopenFeedback(item.id)
      } else {
        await resolveFeedback(item.id)
      }
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'bg-[#0b1b62] text-white'
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Subject, message, name, or email"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 min-h-[420px] space-y-3">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.submitter_name}</p>
                      {item.submitter_role && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeClasses[item.submitter_role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                        >
                          {item.submitter_role}
                        </span>
                      )}
                    </div>
                    {item.submitter_email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.submitter_email}</p>
                    )}
                    <p className="mt-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">{item.subject}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{item.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500" title={formatDateLong(item.created_at)}>
                        {formatRelativeTime(item.created_at)}
                      </p>
                      {item.image_path && (
                        <button
                          type="button"
                          onClick={() => handleViewImage(item)}
                          disabled={loadingImageId === item.id}
                          className="flex items-center gap-1 text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline disabled:opacity-60"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          {loadingImageId === item.id ? 'Loading…' : 'View Screenshot'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  disabled={workingId === item.id}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    item.resolved
                      ? 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'border-[#0b1b62] dark:border-indigo-300 text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white'
                  }`}
                >
                  {workingId === item.id ? 'Working…' : item.resolved ? 'Reopen' : 'Mark Resolved'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-400 dark:text-gray-500">
            No feedback here.
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {previewUrl && <DocumentPreviewModal url={previewUrl} title="Bug Report Screenshot" onClose={() => setPreviewUrl(null)} />}
    </>
  )
}
