'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { isOverdue, summarizeOutstanding } from '@/lib/payments'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'
import { RecordPaymentModal } from '@/components/admin/record-payment-modal'
import { MarkPaidControl } from '@/components/admin/mark-paid-control'
import type { SearchableOption } from '@/components/ui/searchable-select'

export type PaymentRow = {
  id: string
  student_id: string
  studentName: string
  studentAccountId: string | null
  fee_type: string
  description: string | null
  amount: number
  due_date: string | null
  status: string
  payment_method: string | null
  transaction_date: string | null
  receipt_ref: string | null
}

const statusBadgeClasses: Record<string, string> = {
  paid: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  overdue: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

// "Overdue" is a display-only label — the underlying `status` column stays
// `pending` (no scheduled job flips it), a past-due pending item just
// renders with this label/color instead of a real distinct DB state. See
// the Payments & wallet note in CLAUDE.md.
function displayStatus(row: PaymentRow) {
  return isOverdue(row) ? 'overdue' : row.status
}

export function PaymentsTable({
  payments,
  studentOptions,
  initialStatus = 'all',
}: {
  payments: PaymentRow[]
  studentOptions: SearchableOption[]
  initialStatus?: string
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [showRecordModal, setShowRecordModal] = useState(false)

  const filtered = payments.filter((p) => {
    if (statusFilter !== 'all' && displayStatus(p) !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      p.studentName.toLowerCase().includes(term) ||
      (p.studentAccountId ?? '').toLowerCase().includes(term) ||
      (p.description ?? '').toLowerCase().includes(term) ||
      (p.receipt_ref ?? '').toLowerCase().includes(term)
    )
  })

  // Overall figures ignore the search/status filters on purpose (they're the
  // school's real outstanding balance); the third tile follows the filters, so
  // searching a student's name answers "how much does this family still owe".
  const overall = summarizeOutstanding(payments)
  const inView = summarizeOutstanding(filtered)
  const isFiltered = statusFilter !== 'all' || search.trim() !== ''

  const sortOptions: SortOption<PaymentRow>[] = useMemo(
    () => [
      { value: 'student_asc', label: 'Student Name (A-Z)', compare: (a, b) => compareStrings(a.studentName, b.studentName) },
      { value: 'student_desc', label: 'Student Name (Z-A)', compare: (a, b) => compareStrings(b.studentName, a.studentName) },
      { value: 'amount_desc', label: 'Amount (High-Low)', compare: (a, b) => b.amount - a.amount },
      { value: 'amount_asc', label: 'Amount (Low-High)', compare: (a, b) => a.amount - b.amount },
      { value: 'due_date_asc', label: 'Due Date (Soonest)', compare: (a, b) => compareDates(a.due_date, b.due_date) },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    sorted,
    `${search}|${statusFilter}|${sortKey}`
  )

  return (
    <>
      <div className={`mb-4 grid grid-cols-1 gap-4 ${isFiltered ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-rose-400 dark:border-l-rose-600 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding Balance</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(overall.outstanding)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {overall.outstandingCount} unpaid fee {overall.outstandingCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-500 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(overall.overdue)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {overall.overdueCount} past-due {overall.overdueCount === 1 ? 'item' : 'items'}, included in the total
          </p>
        </div>
        {isFiltered && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-indigo-400 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding in These Results</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(inView.outstanding)}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {inView.outstandingCount} unpaid fee {inView.outstandingCount === 1 ? 'item' : 'items'} matching your filters
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_260px_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search Payments</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student name, ID, description, or receipt #"
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
          <div className="flex items-end">
            <button
              onClick={() => setShowRecordModal(true)}
              className="w-full rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d] sm:w-auto"
            >
              Record Manual Payment
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Fee</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((p) => {
                  const status = displayStatus(p)
                  return (
                    <tr key={p.id}>
                      <td className="p-4">
                        <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{p.studentName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.studentAccountId ?? '-'}</p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <p>{p.description ?? p.fee_type}</p>
                        {p.payment_method && (
                          <p className="text-xs capitalize text-gray-400 dark:text-gray-500">via {p.payment_method}</p>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(p.amount)}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {p.due_date ? formatDateShort(p.due_date) : '-'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        {p.status === 'paid' ? (
                          <Link
                            href={`/admin/payments/${p.id}/receipt`}
                            className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                          >
                            View Receipt
                          </Link>
                        ) : (
                          <MarkPaidControl paymentId={p.id} />
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No payments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {showRecordModal && (
        <RecordPaymentModal studentOptions={studentOptions} onClose={() => setShowRecordModal(false)} />
      )}
    </>
  )
}
