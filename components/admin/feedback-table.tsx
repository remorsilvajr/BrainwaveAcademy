'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ImageIcon, ChevronRight, X } from 'lucide-react'
import { resolveFeedback, reopenFeedback, respondToFeedback } from '@/app/admin/actions'
import { getFeedbackImageUrl } from '@/app/admin/feedback/actions'
import { formatDateLong, formatRelativeTime } from '@/lib/format'
import { feedbackCategoryLabels, feedbackCategoryOrder } from '@/lib/feedback'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal'
import { Modal } from '@/components/ui/modal'

type FeedbackItem = {
  id: string
  subject: string
  message: string
  category: string
  resolved: boolean
  created_at: string
  image_path: string | null
  admin_response: string | null
  responded_at: string | null
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

// Detail view for one feedback item. Owns all the per-item state (reply draft,
// screenshot loading, in-flight resolve) so the list stays a plain, scannable
// column of subjects. Rendered with `key={item.id}` by the caller, which is
// what resets the reply draft when a different item is opened.
function FeedbackDetailModal({ item, onClose }: { item: FeedbackItem; onClose: () => void }) {
  const router = useRouter()
  const [isWorking, setIsWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyCategory, setReplyCategory] = useState(item.category)
  const [replyText, setReplyText] = useState(item.admin_response ?? '')
  const [isSending, setIsSending] = useState(false)

  async function handleViewImage() {
    if (!item.image_path) return
    setIsLoadingImage(true)
    setErrorMessage('')
    try {
      const result = await getFeedbackImageUrl(item.image_path)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setPreviewUrl(result.url)
    } catch {
      setErrorMessage('Could not load the screenshot.')
    } finally {
      setIsLoadingImage(false)
    }
  }

  async function handleToggle() {
    setIsWorking(true)
    setErrorMessage('')
    try {
      const result = item.resolved ? await reopenFeedback(item.id) : await resolveFeedback(item.id)
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleSendResponse() {
    setIsSending(true)
    setErrorMessage('')
    try {
      const result = await respondToFeedback(item.id, replyCategory, replyText)
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      setReplyOpen(false)
      router.refresh()
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth="2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {feedbackCategoryLabels[item.category] ?? item.category}
              </span>
              {item.resolved && (
                <span className="inline-block rounded-full bg-green-50 dark:bg-green-950/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                  Resolved
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[#0b1b62] dark:text-indigo-300">{item.subject}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {errorMessage && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="flex items-start gap-3">
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
              {item.submitter_email && <p className="text-xs text-gray-400 dark:text-gray-500">{item.submitter_email}</p>}
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                {formatDateLong(item.created_at)} ({formatRelativeTime(item.created_at)})
              </p>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{item.message}</p>

          {item.image_path && (
            <button
              type="button"
              onClick={handleViewImage}
              disabled={isLoadingImage}
              className="flex items-center gap-1 text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline disabled:opacity-60"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {isLoadingImage ? 'Loading…' : 'View Screenshot'}
            </button>
          )}

          {item.admin_response && !replyOpen && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Admin Response{item.responded_at ? ` · ${formatDateLong(item.responded_at)}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{item.admin_response}</p>
            </div>
          )}

          {replyOpen ? (
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <select
                value={replyCategory}
                onChange={(e) => setReplyCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              >
                {feedbackCategoryOrder.map((value) => (
                  <option key={value} value={value}>
                    {feedbackCategoryLabels[value]}
                  </option>
                ))}
              </select>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Write a response…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  disabled={isSending}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendResponse}
                  disabled={isSending || !replyText.trim()}
                  className="rounded-lg bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSending ? 'Sending…' : 'Send Response'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setReplyOpen(true)
                setReplyCategory(item.category)
                setReplyText(item.admin_response ?? '')
                setErrorMessage('')
              }}
              className="text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
            >
              {item.admin_response ? 'Edit Response' : 'Categorize & Reply'}
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isWorking}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              item.resolved
                ? 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                : 'border-[#0b1b62] bg-[#0b1b62] text-white hover:bg-[#08154d]'
            }`}
          >
            {isWorking ? 'Working…' : item.resolved ? 'Reopen' : 'Mark Resolved'}
          </button>
        </div>
      </Modal>

      {previewUrl && <DocumentPreviewModal url={previewUrl} title="Bug Report Screenshot" onClose={() => setPreviewUrl(null)} />}
    </>
  )
}

// Compact list: just the subject per row, opening a detail modal on click.
// The full message, reply and resolve controls all live in that modal, which
// keeps the inbox scannable no matter how long a report's body is.
// `initialOpenId` lets other pages (the dashboard's feedback log) deep-link
// straight to one item via /admin/feedback?open=<id>.
export function FeedbackTable({ items, initialOpenId = null }: { items: FeedbackItem[]; initialOpenId?: string | null }) {
  const [tab, setTab] = useState<Tab>('unresolved')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(initialOpenId)

  // Derived from `items` (not stored) so a router.refresh() after a reply or
  // resolve is reflected in the open modal immediately.
  const openItem = openId ? (items.find((f) => f.id === openId) ?? null) : null

  const counts = {
    all: items.length,
    unresolved: items.filter((f) => !f.resolved).length,
    resolved: items.filter((f) => f.resolved).length,
  }

  const tabItems = tab === 'all' ? items : items.filter((f) => (tab === 'resolved' ? f.resolved : !f.resolved))

  const filtered = tabItems.filter((f) => {
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      f.subject.toLowerCase().includes(term) ||
      f.message.toLowerCase().includes(term) ||
      f.submitter_name.toLowerCase().includes(term) ||
      (f.submitter_email ?? '').toLowerCase().includes(term)
    )
  })

  const sortOptions: SortOption<FeedbackItem>[] = useMemo(
    () => [
      { value: 'date_desc', label: 'Date (Newest)', compare: (a, b) => compareDates(b.created_at, a.created_at) },
      { value: 'date_asc', label: 'Date (Oldest)', compare: (a, b) => compareDates(a.created_at, b.created_at) },
      { value: 'submitter_asc', label: 'Submitter (A-Z)', compare: (a, b) => compareStrings(a.submitter_name, b.submitter_name) },
      { value: 'subject_asc', label: 'Subject (A-Z)', compare: (a, b) => compareStrings(a.subject, b.subject) },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    sorted,
    `${tab}|${search}|${categoryFilter}|${sortKey}`
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'unresolved', label: 'Unresolved', count: counts.unresolved },
    { key: 'resolved', label: 'Resolved', count: counts.resolved },
    { key: 'all', label: 'All', count: counts.all },
  ]

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

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px_260px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subject, message, name, or email"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All</option>
              {feedbackCategoryOrder.map((value) => (
                <option key={value} value={value}>
                  {feedbackCategoryLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
        </div>
      </div>

      <div className="mt-4 min-h-[420px] space-y-2">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(item.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 text-left transition hover:border-[#0b1b62] dark:hover:border-indigo-300"
            >
              <Mail className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.subject}
              </span>
              {item.resolved && (
                <span className="shrink-0 rounded-full bg-green-50 dark:bg-green-950/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                  Resolved
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-400 dark:text-gray-500">
            No feedback here.
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {openItem && <FeedbackDetailModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
    </>
  )
}
