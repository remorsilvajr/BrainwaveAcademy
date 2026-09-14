'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'
import { approveWalletRequest, denyWalletRequest } from '@/app/admin/payments/actions'

type WalletRequest = {
  id: string
  parentName: string
  parentEmail: string | null
  requested_amount: number
  note: string | null
  status: string
  approved_amount: number | null
  review_note: string | null
  created_at: string
}

function RequestRow({ request }: { request: WalletRequest }) {
  const router = useRouter()
  const [amount, setAmount] = useState(String(request.requested_amount))
  const [confirming, setConfirming] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setError('')
    setIsPending(true)
    try {
      await approveWalletRequest(request.id, Number(amount))
      setConfirming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsPending(false)
    }
  }

  async function handleDeny() {
    setError('')
    setIsPending(true)
    try {
      await denyWalletRequest(request.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{request.parentName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Requested {formatCurrency(request.requested_amount)} on {formatDateLong(request.created_at)}
          {request.note ? `, note: "${request.note}"` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Credit</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-2 py-1.5 text-xs focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={() => setConfirming(true)}
          disabled={isPending}
          className="rounded-full bg-[#0b1b62] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
        >
          Approve
        </button>
        <button
          onClick={handleDeny}
          disabled={isPending}
          className="rounded-full border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
        >
          Deny
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title="Credit this wallet?"
          description={`${formatCurrency(Number(amount) || 0)} will be added to ${request.parentName}'s wallet.`}
          confirmLabel="Yes, Credit Wallet"
          tone="neutral"
          isPending={isPending}
          onConfirm={handleApprove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export function WalletRequestsPanel({ requests }: { requests: WalletRequest[] }) {
  const [showAll, setShowAll] = useState(false)
  const pending = requests.filter((r) => r.status === 'pending')
  const visible = showAll ? requests : pending

  const sortOptions: SortOption<WalletRequest>[] = useMemo(
    () => [
      { value: 'date_desc', label: 'Date (Newest)', compare: (a, b) => compareDates(b.created_at, a.created_at) },
      { value: 'date_asc', label: 'Date (Oldest)', compare: (a, b) => compareDates(a.created_at, b.created_at) },
      { value: 'name_asc', label: 'Parent (A-Z)', compare: (a, b) => compareStrings(a.parentName, b.parentName) },
      { value: 'amount_desc', label: 'Amount (High-Low)', compare: (a, b) => b.requested_amount - a.requested_amount },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(visible, sortOptions)

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, `${showAll}|${sortKey}`)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-[#0b1b62] dark:text-indigo-300">
          Wallet Fund Requests {pending.length > 0 && `(${pending.length} pending)`}
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} hideLabel />
          </div>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
          >
            {showAll ? 'Show pending only' : 'Show all'}
          </button>
        </div>
      </div>
      <div className="mt-3 min-h-[180px] space-y-2">
        {pageItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {showAll ? 'No wallet fund requests yet.' : 'No pending requests.'}
          </p>
        ) : (
          pageItems.map((r) =>
            r.status === 'pending' ? (
              <RequestRow key={r.id} request={r} />
            ) : (
              <div
                key={r.id}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.parentName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requested {formatCurrency(r.requested_amount)} on {formatDateLong(r.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-block w-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                    r.status === 'approved'
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {r.status === 'approved' ? `Approved ${formatCurrency(r.approved_amount ?? 0)}` : 'Denied'}
                </span>
              </div>
            )
          )
        )}
      </div>
      <div className="-mx-4 -mb-4 mt-2">
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
