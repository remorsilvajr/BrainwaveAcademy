'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { resolveFeedback } from '@/app/admin/actions'
import { formatRelativeTime } from '@/lib/format'

type FeedbackItem = {
  id: string
  subject: string
  message: string
  created_at: string
  submitter_name: string
}

export function PriorityFeedbackLog({ items, viewAllHref }: { items: FeedbackItem[]; viewAllHref?: string }) {
  const router = useRouter()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleResolve(id: string) {
    setResolvingId(id)
    setErrorMessage('')
    try {
      await resolveFeedback(id)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-[#0b1b62] dark:text-indigo-300">Priority Actions &amp; Feedback Log</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            View All
          </Link>
        )}
      </div>
      {errorMessage && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No unresolved feedback right now.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3"
            >
              <div className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.submitter_name}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{item.message}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(item.created_at)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleResolve(item.id)}
                disabled={resolvingId === item.id}
                className="shrink-0 rounded border px-3 py-1 text-xs font-medium disabled:opacity-60"
              >
                {resolvingId === item.id ? 'Resolving…' : 'Resolve'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
