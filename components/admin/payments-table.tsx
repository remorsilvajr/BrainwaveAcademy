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
  due_date: string | null
  status: string
  payment_method: string | null
  transaction_date: string | null
  receipt_ref: string | null
}

// One admin wallet adjustment (the Adjust button in Parent Wallets). `amount` is
// signed: negative is a deduction, positive an addition. It's parent-level (no
// student) and isn't a fee, so it never counts toward Outstanding or Collected.
export type WalletTxRow = {
  id: string
  parentName: string
  parentEmail: string | null
  amount: number
  balance_after: number | null
  note: string | null
  created_at: string
}

// The Payments page is split so each tab has one job:
// - fees: what is (or was) owed and not yet paid: unpaid, overdue, waived, voided.
//   This is where fees get corrected (edit, waive, void) and cash gets recorded.
// - received: money that came in (paid fees) with receipts and reversals.
// - activity: the ledger of admin wallet adjustments.
export type PaymentsView = 'fees' | 'received' | 'activity'

// Everything a view lists, normalized so search/sort/pagination treat a fee and
// a wallet adjustment the same way.
type Item = {
  key: string
  name: string
  amount: number
  due: string | null
  when: string | null
  status: string
  searchText: string
  payment: PaymentRow | null
  tx: WalletTxRow | null
}

const statusBadgeClasses: Record<string, string> = {
  deducted: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  added: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
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
    { value: 'wallet', label: 'Wallet' },
    { value: 'cash', label: 'Cash' },
  ],
  activity: [
    { value: 'all', label: 'All' },
    { value: 'deducted', label: 'Deductions' },
    { value: 'added', label: 'Additions' },
  ],
}

const copy: Record<PaymentsView, { search: string; empty: string }> = {
  fees: { search: 'Student name, ID, or description', empty: 'No fees match your search.' },
  received: { search: 'Student name, ID, description, or receipt #', empty: 'No payments match your search.' },
  activity: { search: 'Parent name, email, or note', empty: 'No wallet activity matches your search.' },
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
  walletTransactions,
  adjustmentsByPayment,
  studentOptions,
  initialStatus = 'all',
}: {
  view: PaymentsView
  payments: PaymentRow[]
  walletTransactions: WalletTxRow[]
  adjustmentsByPayment: Record<string, FeeAdjustment[]>
  studentOptions: SearchableOption[]
  initialStatus?: string
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(
    filterOptions[view].some((o) => o.value === initialStatus) ? initialStatus : 'all'
  )
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [managing, setManaging] = useState<PaymentRow | null>(null)
  const [reversing, setReversing] = useState<PaymentRow | null>(null)

  const items: Item[] = useMemo(() => {
    if (view === 'activity') {
      return walletTransactions.map((t) => ({
        key: `wallet-${t.id}`,
        name: t.parentName,
        amount: Math.abs(t.amount),
        due: null,
        when: t.created_at,
        status: t.amount < 0 ? 'deducted' : 'added',
        searchText: [t.parentName, t.parentEmail, t.note].filter(Boolean).join(' ').toLowerCase(),
        payment: null,
        tx: t,
      }))
    }
    return payments
      .filter((p) => (view === 'received' ? p.status === 'paid' : p.status !== 'paid'))
      .map((p) => ({
        key: `payment-${p.id}`,
        name: p.studentName,
        amount: p.amount,
        due: p.due_date,
        when: p.transaction_date,
        status: view === 'received' ? (p.payment_method ?? 'paid') : displayStatus(p),
        searchText: [p.studentName, p.studentAccountId, p.description, p.receipt_ref].filter(Boolean).join(' ').toLowerCase(),
        payment: p,
        tx: null,
      }))
  }, [view, payments, walletTransactions])

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false
    if (!search.trim()) return true
    return item.searchText.includes(search.trim().toLowerCase())
  })

  const isFiltered = filter !== 'all' || search.trim() !== ''

  // Overall figures ignore the search and filter on purpose (they are the
  // school's real totals); the last tile follows them.
  const overall = summarizeOutstanding(payments)
  const inView = summarizeOutstanding(filtered.flatMap((item) => (item.payment ? [item.payment] : [])))

  const paid = payments.filter((p) => p.status === 'paid')
  const collectedTotal = roundToCents(paid.reduce((sum, p) => sum + p.amount, 0))
  const collectedViaWallet = roundToCents(paid.filter((p) => p.payment_method === 'wallet').reduce((sum, p) => sum + p.amount, 0))
  const collectedInView = roundToCents(filtered.reduce((sum, item) => sum + (item.payment?.amount ?? 0), 0))

  const deductedTotal = roundToCents(walletTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0))
  const addedTotal = roundToCents(walletTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0))

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
      : view === 'received'
        ? ['Student', 'Fee', 'Amount', 'Paid On', 'Method', 'Action']
        : ['Parent', 'Entry', 'Amount', 'Date', 'Type']

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
              sub={`${paid.length} paid fee ${paid.length === 1 ? 'item' : 'items'}: ${formatCurrency(collectedViaWallet)} wallet, ${formatCurrency(roundToCents(collectedTotal - collectedViaWallet))} cash`}
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
        {view === 'activity' && (
          <>
            <Tile
              label="Total Deducted by Admin"
              value={formatCurrency(deductedTotal)}
              sub={`${walletTransactions.filter((t) => t.amount < 0).length} deductions`}
              accent="border-l-red-400"
              valueClass="text-red-600 dark:text-red-400"
            />
            <Tile
              label="Total Added by Admin"
              value={formatCurrency(addedTotal)}
              sub={`${walletTransactions.filter((t) => t.amount > 0).length} additions`}
              accent="border-l-green-400"
              valueClass="text-green-600 dark:text-green-400"
            />
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
              {view === 'received' ? 'Method' : view === 'activity' ? 'Type' : 'Status'}
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
                  const t = item.tx
                  if (t) {
                    const isDeduction = t.amount < 0
                    return (
                      <tr key={item.key}>
                        <td className="p-4">
                          <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{t.parentName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t.parentEmail ?? 'Parent wallet'}</p>
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-300">
                          <p>{isDeduction ? 'Wallet deduction' : 'Wallet addition'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {[t.note, t.balance_after != null ? `Balance after ${formatCurrency(t.balance_after)}` : null].filter(Boolean).join(' · ') || 'By admin'}
                          </p>
                        </td>
                        <td className={`p-4 font-medium ${isDeduction ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isDeduction ? '-' : '+'}
                          {formatCurrency(Math.abs(t.amount))}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-300">{formatDateShort(t.created_at)}</td>
                        <td className="p-4">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses[item.status]}`}>{item.status}</span>
                        </td>
                      </tr>
                    )
                  }
                  if (!p) return null
                  return (
                    <tr key={item.key}>
                      <td className="p-4">
                        <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{p.studentName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.studentAccountId ?? '-'}</p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <p>{p.description ?? p.fee_type}</p>
                        {view === 'received' && p.receipt_ref && <p className="text-xs text-gray-400 dark:text-gray-500">{p.receipt_ref}</p>}
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(p.amount)}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {view === 'fees' ? (p.due_date ? formatDateShort(p.due_date) : '-') : p.transaction_date ? formatDateShort(p.transaction_date) : '-'}
                      </td>
                      <td className="p-4">
                        {view === 'received' ? (
                          <span className="inline-block rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium capitalize text-green-700 dark:bg-green-950/30 dark:text-green-400">
                            {p.payment_method ?? 'paid'}
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
                              href={`/admin/payments/${p.id}/receipt`}
                              className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                            >
                              View Receipt
                            </Link>
                            <button
                              type="button"
                              onClick={() => setReversing(p)}
                              className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              Reverse
                            </button>
                          </div>
                        ) : p.status === 'pending' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <MarkPaidControl paymentId={p.id} />
                            <button
                              type="button"
                              onClick={() => setManaging(p)}
                              className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              Manage
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setManaging(p)}
                            className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Details
                          </button>
                        )}
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
        />
      )}
      {reversing && (
        <ReversePaymentModal
          key={reversing.id}
          fee={reversing}
          adjustments={adjustmentsByPayment[reversing.id] ?? []}
          onClose={() => setReversing(null)}
        />
      )}
    </>
  )
}
