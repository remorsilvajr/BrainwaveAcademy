'use client'

import { useMemo } from 'react'
import { Inbox } from 'lucide-react'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { usePagination } from '@/lib/use-pagination'
import { compareDates, useSort, type SortOption } from '@/lib/use-sort'

export type FundRequest = {
  id: string
  requested_amount: number
  approved_amount: number | null
  status: string
  note: string | null
  review_note: string | null
  reviewed_at: string | null
  created_at: string
}

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  denied: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  denied: 'Denied',
}

// Every wallet top-up the parent has asked for and what the school decided.
// Lives in its own tab on the Payments page (see PaymentsTabs) rather than
// under the wallet balance.
export function FundRequestHistory({ requests }: { requests: FundRequest[] }) {
  const sortOptions: SortOption<FundRequest>[] = useMemo(
    () => [
      { value: 'newest', label: 'Newest', compare: (a, b) => compareDates(b.created_at, a.created_at) },
      { value: 'oldest', label: 'Oldest', compare: (a, b) => compareDates(a.created_at, b.created_at) },
      { value: 'amount', label: 'High-Low', compare: (a, b) => b.requested_amount - a.requested_amount },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(requests, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, sortKey)

  if (requests.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
        <Inbox className="h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">No fund requests yet</p>
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          When you ask for a wallet top-up with Add Funds, the request and the school&apos;s decision will be listed here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request History</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your wallet top-up requests and what the school decided.
          </p>
        </div>
        <div className="w-40">
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} hideLabel />
        </div>
      </div>

      <ul className="mt-4 min-h-[360px] space-y-3">
        {pageItems.map((r) => {
          const decidedDifferently =
            r.status === 'approved' && r.approved_amount != null && r.approved_amount !== r.requested_amount
          return (
            <li key={r.id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(r.requested_amount)}
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">requested</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatDateLong(r.created_at)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses[r.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                >
                  {statusLabels[r.status] ?? r.status}
                </span>
              </div>

              {r.status === 'approved' && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Added to your wallet:{' '}
                  <span className="font-semibold">{formatCurrency(r.approved_amount ?? r.requested_amount)}</span>
                  {decidedDifferently && (
                    <span className="text-gray-500 dark:text-gray-400"> (you asked for {formatCurrency(r.requested_amount)})</span>
                  )}
                </p>
              )}
              {r.reviewed_at && r.status !== 'pending' && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Decided on {formatDateLong(r.reviewed_at)}</p>
              )}
              {r.note && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Your note:</span> {r.note}
                </p>
              )}
              {r.review_note && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">From the school:</span> {r.review_note}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}
