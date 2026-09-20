import Link from 'next/link'
import { Mail, ChevronRight } from 'lucide-react'

type FeedbackItem = {
  id: string
  subject: string
}

// Subject-only, each row a link into the full inbox with that item's detail
// modal already open (/admin/feedback?open=<id>). Resolving happens inside
// that modal, not from the dashboard.
export function PriorityFeedbackLog({ items, viewAllHref }: { items: FeedbackItem[]; viewAllHref?: string }) {
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
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No unresolved feedback right now.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/feedback?open=${item.id}`}
              className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-3 transition hover:border-[#0b1b62] dark:hover:border-indigo-300"
            >
              <Mail className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.subject}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
