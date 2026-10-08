'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDateShort, roundToCents } from '@/lib/format'
import { isOverdue, summarizeOutstanding } from '@/lib/payments'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'
import { RecordPaymentModal } from '@/components/admin/record-payment-modal'
import { MarkPaidControl } from '@/components/admin/mark-paid-control'
import { FeeManageModal } from '@/components/admin/fee-manage-modal'
import { ReversePaymentModal } from '@/components/admin/reverse-payment-modal'
import type { SearchableOption } from '@/components/ui/searchable-select'
import type { FeeAdjustment } from '@/lib/fees'

export type PaymentRow = {
  id: string
  student_id: string
  studentName: string
  studentAccountId: string | null
  fee_type: string
  description: string | null
  amount: number
  amount_paid: number
  due_date: string | null
  status: string
  payment_method: string | null
  transaction_date: string | null
  receipt_ref: string | null
}

// One payment received toward a fee (a payment_transactions row). A fee can be
// paid in installments, so money collected is counted from these, not from fees.
export type ReceivedRow = {
  id: string
  payment_id: string
  amount: number
  payment_method: string
  transaction_date: string
  receipt_ref: string | null
}

// The Payments page is split so each tab has one job:
// - fees: what is (or was) owed and not yet paid: unpaid, overdue, waived, voided.
//   This is where fees get corrected (edit, waive, void) and cash gets recorded.
// - received: money that came in, one row per payment (installments included),
//   with receipts and reversals.
export type PaymentsView = 'fees' | 'received'

// Everything a view lists, normalized so search/sort/pagination treat both views the same way.
type Item = {
  key: string
  name: string
  amount: number
  due: string | null
  when: string | null
  status: string
  searchText: string
  payment: PaymentRow
  received: ReceivedRow | null
}

const statusBadgeClasses: Record<string, string> = {
  paid: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  waived: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  voided: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 line-through',
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  overdue: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

// "Overdue" is a display-only label: the underlying `status` column stays
// `pending` (no scheduled job flips it). See the Payments & wallet note in CLAUDE.md.
function displayStatus(row: PaymentRow) {
  return isOverdue(row) ? 'overdue' : row.status
}

const filterOptions: Record<PaymentsView, { value: string; label: string }[]> = {
  fees: [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'waived', label: 'Waived' },
    { value: 'voided', label: 'Voided' },
  ],
  received: [
    { value: 'all', label: 'All methods' },
    { value: 'card', label: 'Card (online)' },
    { value: 'gcash', label: 'GCash (online)' },
    { value: 'cash', label: 'Cash' },
    { value: 'wallet', label: 'Wallet (old)' },
  ],
}

const methodLabels: Record<string, string> = { card: 'Card', gcash: 'GCash', cash: 'Cash', wallet: 'Wallet', check: 'Check' }

const copy: Record<PaymentsView, { search: string; empty: string }> = {
  fees: { search: 'Student name, ID, or description', empty: 'No fees match your search.' },
  received: { search: 'Student name, ID, description, or receipt #', empty: 'No payments match your search.' },
}

function Tile({ label, value, sub, accent, valueClass }: { label: string; value: string; sub: string; accent: string; valueClass?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${accent} bg-white dark:bg-gray-900 p-4 shadow-sm`}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
    </div>
  )
}

export function PaymentsTable({
  view,
  payments,
  received,
  adjustmentsByPayment,
  studentOptions,
  initialStatus = 'all',
  initialSearch = '',
  canCorrect = true,
  canDeleteFees = false,
  receiptBasePath = '/admin/payments',
}: {
  view: PaymentsView
  payments: PaymentRow[]
  received: ReceivedRow[]
  adjustmentsByPayment: Record<string, FeeAdjustment[]>
  studentOptions: SearchableOption[]
  initialStatus?: string
  // Student Balances' View Fees opens this tab already searching for one student.
  initialSearch?: string
  // Admin only: waive, void, edit and reverse. The cashier portal passes false.
  canCorrect?: boolean
  // Super admin only: delete a fee with nothing paid (moves to Deleted Items).
  canDeleteFees?: boolean
  receiptBasePath?: string
}) {
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState(
    filterOptions[view].some((o) => o.value === initialStatus) ? initialStatus : 'all'
  )
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [managing, setManaging] = useState<PaymentRow | null>(null)
  const [reversing, setReversing] = useState<PaymentRow | null>(null)

  const items: Item[] = useMemo(() => {
    if (view === 'received') {
      const feeById = new Map(payments.map((p) => [p.id, p]))
      return received.flatMap((r) => {
        const p = feeById.get(r.payment_id)
        if (!p) return []
        return [
          {
            key: `received-${r.id}`,
            name: p.studentName,
            amount: r.amount,
            due: p.due_date,
            when: r.transaction_date,
            status: r.payment_method,
            searchText: [p.studentName, p.studentAccountId, p.description, r.receipt_ref].filter(Boolean).join(' ').toLowerCase(),
            payment: p,
            received: r,
          },
        ]
      })
    }
    // Fees still owed (a partly paid one included), plus waived and voided.
    return payments
      .filter((p) => p.status !== 'paid')
      .map((p) => ({
        key: `payment-${p.id}`,
        name: p.studentName,
        amount: roundToCents(p.amount - p.amount_paid),
        due: p.due_date,
        when: p.transaction_date,
        status: displayStatus(p),
        searchText: [p.studentName, p.studentAccountId, p.description, p.receipt_ref].filter(Boolean).join(' ').toLowerCase(),
        payment: p,
        received: null,
      }))
  }, [view, payments, received])

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false
    if (!search.trim()) return true
    return item.searchText.includes(search.trim().toLowerCase())
  })

  const isFiltered = filter !== 'all' || search.trim() !== ''

  // Overall figures ignore the search and filter on purpose (they are the
  // school's real totals); the last tile follows them.
  const overall = summarizeOutstanding(payments)
  const inView = summarizeOutstanding(filtered.map((item) => item.payment))

  const collectedTotal = roundToCents(received.reduce((sum, r) => sum + r.amount, 0))
  const collectedBy = (methods: string[]) =>
    roundToCents(received.filter((r) => methods.includes(r.payment_method)).reduce((sum, r) => sum + r.amount, 0))
  const collectedOnline = collectedBy(['card', 'gcash'])
  const collectedCash = collectedBy(['cash', 'check'])
  const collectedWallet = collectedBy(['wallet'])
  const collectedInView = roundToCents(filtered.reduce((sum, item) => sum + (item.received?.amount ?? 0), 0))

  const sortOptions: SortOption<Item>[] = useMemo(
    () => [
      { value: 'student_asc', label: 'Name (A-Z)', compare: (a, b) => compareStrings(a.name, b.name) },
      { value: 'student_desc', label: 'Name (Z-A)', compare: (a, b) => compareStrings(b.name, a.name) },
      { value: 'amount_desc', label: 'Amount (High-Low)', compare: (a, b) => b.amount - a.amount },
      { value: 'amount_asc', label: 'Amount (Low-High)', compare: (a, b) => a.amount - b.amount },
      view === 'fees'
        ? { value: 'due_date_asc', label: 'Due Date (Soonest)', compare: (a, b) => compareDates(a.due, b.due) }
        : { value: 'when_desc', label: 'Date (Newest)', compare: (a, b) => compareDates(b.when, a.when) },
    ],
    [view]
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, `${view}|${search}|${filter}|${sortKey}`)

  const headers =
    view === 'fees'
      ? ['Student', 'Fee', 'Amount', 'Due Date', 'Status', 'Action']
      : ['Student', 'Fee', 'Amount', 'Paid On', 'Method', 'Action']

  return (
    <>
      <div className={`mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isFiltered ? 'lg:grid-cols-3' : view === 'fees' ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
        {view === 'fees' && (
          <>
            <Tile
              label="Total Outstanding Balance"
              value={formatCurrency(overall.outstanding)}
              sub={`${overall.outstandingCount} unpaid fee ${overall.outstandingCount === 1 ? 'item' : 'items'}`}
              accent="border-l-rose-400 dark:border-l-rose-600"
            />
            <Tile
              label="Overdue"
              value={formatCurrency(overall.overdue)}
              sub={`${overall.overdueCount} past-due ${overall.overdueCount === 1 ? 'item' : 'items'}, included in the total`}
              accent="border-l-red-500"
              valueClass="text-red-600 dark:text-red-400"
            />
            {isFiltered && (
              <Tile
                label="Outstanding in These Results"
                value={formatCurrency(inView.outstanding)}
                sub={`${inView.outstandingCount} unpaid fee ${inView.outstandingCount === 1 ? 'item' : 'items'} matching your filters`}
                accent="border-l-indigo-400"
              />
            )}
          </>
        )}
        {view === 'received' && (
          <>
            <Tile
              label="Total Collected"
              value={formatCurrency(collectedTotal)}
              sub={`${received.length} ${received.length === 1 ? 'payment' : 'payments'}: ${formatCurrency(collectedOnline)} online, ${formatCurrency(collectedCash)} cash${
                collectedWallet > 0 ? `, ${formatCurrency(collectedWallet)} old wallet` : ''
              }`}
              accent="border-l-green-400 dark:border-l-green-600"
            />
            {isFiltered && (
              <Tile
                label="Collected in These Results"
                value={formatCurrency(collectedInView)}
                sub={`${filtered.length} payment${filtered.length === 1 ? '' : 's'} matching your filters`}
                accent="border-l-indigo-400"
              />
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${view === 'fees' ? 'lg:grid-cols-[1fr_180px_260px_auto]' : 'lg:grid-cols-[1fr_180px_260px]'}`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy[view].search}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {view === 'received' ? 'Method' : 'Status'}
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            >
              {filterOptions[view].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
          {view === 'fees' && (
            <div className="flex items-end">
              <button
                onClick={() => setShowRecordModal(true)}
                className="w-full rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d] sm:w-auto"
              >
                Record Manual Payment
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="p-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((item) => {
                  const p = item.payment
                  const r = item.received
                  const partlyPaid = p.status === 'pending' && p.amount_paid > 0
                  return (
                    <tr key={item.key}>
                      <td className="p-4">
                        <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{p.studentName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.studentAccountId ?? '-'}</p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <p>{p.description ?? p.fee_type}</p>
                        {r?.receipt_ref && <p className="text-xs text-gray-400 dark:text-gray-500">{r.receipt_ref}</p>}
                        {r && r.amount < p.amount && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">Part payment of a {formatCurrency(p.amount)} fee</p>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.amount)}
                        {!r && partlyPaid && (
                          <p className="text-xs font-normal text-[#00a3e0] dark:text-sky-400">
                            {formatCurrency(p.amount_paid)} of {formatCurrency(p.amount)} paid
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {view === 'fees' ? (p.due_date ? formatDateShort(p.due_date) : '-') : r ? formatDateShort(r.transaction_date) : '-'}
                      </td>
                      <td className="p-4">
                        {view === 'received' ? (
                          <span className="inline-block rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium capitalize text-green-700 dark:bg-green-950/30 dark:text-green-400">
                            {r ? (methodLabels[r.payment_method] ?? r.payment_method) : 'paid'}
                          </span>
                        ) : (
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses[item.status]}`}>
                            {item.status === 'pending' ? 'unpaid' : item.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {view === 'received' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`${receiptBasePath}/${p.id}/receipt${r ? `?tx=${r.id}` : ''}`}
                              className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                            >
                              View Receipt
                            </Link>
                            {canCorrect && (
                              <button
                                type="button"
                                onClick={() => setReversing(p)}
                                className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Reverse
                              </button>
                            )}
                          </div>
                        ) : p.status === 'pending' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* key: a new remaining balance (after a part payment) starts the amount box fresh */}
                            <MarkPaidControl key={`${p.id}-${item.amount}`} paymentId={p.id} remainingBalance={item.amount} />
                            {canCorrect && (
                              <button
                                type="button"
                                onClick={() => setManaging(p)}
                                className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Manage
                              </button>
                            )}
                            {canCorrect && partlyPaid && (
                              <button
                                type="button"
                                onClick={() => setReversing(p)}
                                className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Reverse
                              </button>
                            )}
                          </div>
                        ) : canCorrect ? (
                          <button
                            type="button"
                            onClick={() => setManaging(p)}
                            className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Details
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={headers.length} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    {copy[view].empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {showRecordModal && <RecordPaymentModal studentOptions={studentOptions} onClose={() => setShowRecordModal(false)} />}
      {managing && (
        <FeeManageModal
          key={managing.id}
          fee={managing}
          adjustments={adjustmentsByPayment[managing.id] ?? []}
          onClose={() => setManaging(null)}
          canDelete={canDeleteFees}
        />
      )}
      {reversing && (
        <ReversePaymentModal
          key={reversing.id}
          fee={{
            ...reversing,
            walletPaid: roundToCents(
              received.filter((r) => r.payment_id === reversing.id && r.payment_method === 'wallet').reduce((sum, r) => sum + r.amount, 0)
            ),
            cashPaid: roundToCents(
              received.filter((r) => r.payment_id === reversing.id && (r.payment_method === 'cash' || r.payment_method === 'check')).reduce((sum, r) => sum + r.amount, 0)
            ),
            onlinePaid: roundToCents(
              received.filter((r) => r.payment_id === reversing.id && (r.payment_method === 'card' || r.payment_method === 'gcash')).reduce((sum, r) => sum + r.amount, 0)
            ),
          }}
          adjustments={adjustmentsByPayment[reversing.id] ?? []}
          onClose={() => setReversing(null)}
        />
      )}
    </>
  )
}
