'use client'

import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { getMyFeedback, type MyFeedbackItem } from '@/components/feedback/actions'
import { feedbackCategoryLabels } from '@/lib/feedback'
import { formatDateLong } from '@/lib/format'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

// The actual list — shared by MyFeedbackModal (wraps this in Modal chrome)
// and the sidebar Feedback page's "My Feedback" tab (renders this directly).
export function MyFeedbackList() {
  const [items, setItems] = useState<MyFeedbackItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getMyFeedback().then((result) => {
      if (cancelled) return
      if ('error' in result) {
        setError(result.error)
        return
      }
      setItems(result.items)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(items ?? [], '')

  return (
    <>
      <div className="min-h-[320px] flex-1 overflow-y-auto p-6">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && items === null && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        {!error && items?.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No Feedback Sent Yet"
            description="Bug reports and feedback you send will show up here, along with any reply from the admin team."
          />
        )}
        {!error && items && items.length > 0 && (
          <div className="space-y-3">
            {pageItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.subject}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {feedbackCategoryLabels[item.category] ?? item.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.resolved
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.resolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatDateLong(item.created_at)}</p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.message}</p>
                {item.admin_response && (
                  <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Admin Response{item.responded_at ? ` · ${formatDateLong(item.responded_at)}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-2 pb-2">
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </>
  )
}
