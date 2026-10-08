'use client'

import { useMemo, useState } from 'react'
import { formatCurrency, formatDateShort, roundToCents } from '@/lib/format'
import { isOverdue, remainingBalance } from '@/lib/payments'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'
import type { PaymentRow, ReceivedRow } from '@/components/admin/payments-table'

export type BalanceStudent = { id: string; name: string; accountId: string | null; classId: string | null; className: string | null }

type BalanceRow = BalanceStudent & {
  billed: number
  paid: number
  outstanding: number
  overdue: number
  unpaidCount: number
  lastPaid: string | null
}

const selectClasses =
  'w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none'

// Every student with their account balance: what they were billed (waived and
// voided fees left out), what has actually been paid (from the payment
// history, so part payments count), what is still owed and overdue, and the
// last payment date. Same outstanding rule as everywhere else (lib/payments.ts).
export function StudentBalancesTable({
  students,
  classrooms,
  payments,
  received,
  onViewFees,
}: {
  students: BalanceStudent[]
  classrooms: { id: string; name: string }[]
  payments: PaymentRow[]
  received: ReceivedRow[]
  onViewFees: (student: BalanceStudent) => void
}) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [balanceFilter, setBalanceFilter] = useState('all')

  const rows: BalanceRow[] = useMemo(() => {
    const studentOfFee = new Map(payments.map((p) => [p.id, p.student_id]))
    const byStudent = new Map<string, BalanceRow>()
    for (const s of students) {
      byStudent.set(s.id, { ...s, billed: 0, paid: 0, outstanding: 0, overdue: 0, unpaidCount: 0, lastPaid: null })
    }
    for (const p of payments) {
      const row = byStudent.get(p.student_id)
      if (!row || p.status === 'waived' || p.status === 'voided') continue
      row.billed += p.amount
      if (p.status === 'pending') {
        const left = remainingBalance(p)
        row.outstanding += left
        row.unpaidCount += 1
        if (isOverdue(p)) row.overdue += left
      }
    }
    for (const r of received) {
      const row = byStudent.get(studentOfFee.get(r.payment_id) ?? '')
      if (!row) continue
      row.paid += r.amount
      if (!row.lastPaid || r.transaction_date > row.lastPaid) row.lastPaid = r.transaction_date
    }
    return [...byStudent.values()].map((r) => ({
      ...r,
      billed: roundToCents(r.billed),
      paid: roundToCents(r.paid),
      outstanding: roundToCents(r.outstanding),
      overdue: roundToCents(r.overdue),
    }))
  }, [students, payments, received])

  const filtered = rows.filter((r) => {
    if (classFilter === 'none' ? r.classId !== null : classFilter !== 'all' && r.classId !== classFilter) return false
    if (balanceFilter === 'owing' && r.outstanding <= 0) return false
    if (balanceFilter === 'overdue' && r.overdue <= 0) return false
    if (balanceFilter === 'clear' && r.outstanding > 0) return false
    const term = search.trim().toLowerCase()
    return !term || `${r.name} ${r.accountId ?? ''}`.toLowerCase().includes(term)
  })

  const totals = {
    outstanding: roundToCents(filtered.reduce((sum, r) => sum + r.outstanding, 0)),
    overdue: roundToCents(filtered.reduce((sum, r) => sum + r.overdue, 0)),
    owing: filtered.filter((r) => r.outstanding > 0).length,
  }

  const sortOptions: SortOption<BalanceRow>[] = useMemo(
    () => [
      { value: 'owed_desc', label: 'Owed (High-Low)', compare: (a, b) => b.outstanding - a.outstanding || compareStrings(a.name, b.name) },
      { value: 'overdue_desc', label: 'Overdue (High-Low)', compare: (a, b) => b.overdue - a.overdue || compareStrings(a.name, b.name) },
      { value: 'name_asc', label: 'Name (A-Z)', compare: (a, b) => compareStrings(a.name, b.name) },
      { value: 'paid_desc', label: 'Last Paid (Newest)', compare: (a, b) => compareDates(b.lastPaid, a.lastPaid) },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    sorted,
    `${search}|${classFilter}|${balanceFilter}|${sortKey}`
  )

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-rose-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:border-l-rose-600 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Still Owed (these students)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totals.outstanding)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {totals.owing} of {filtered.length} {filtered.length === 1 ? 'student owes' : 'students owe'} something
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-500 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue (these students)</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totals.overdue)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Included in Still Owed</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_180px_260px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student name or ID"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Class</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectClasses}>
              <option value="all">All classes</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">No class</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Balance</label>
            <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)} className={selectClasses}>
              <option value="all">All students</option>
              <option value="owing">Owes something</option>
              <option value="overdue">Has overdue</option>
              <option value="clear">Fully paid</option>
            </select>
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                {['Student', 'Class', 'Total Fees', 'Paid', 'Still Owed', 'Overdue', 'Last Payment', 'Action'].map((h) => (
                  <th key={h} className="p-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="p-4">
                      <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{r.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{r.accountId ?? '-'}</p>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{r.className ?? 'No class'}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{formatCurrency(r.billed)}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{formatCurrency(r.paid)}</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(r.outstanding)}
                      {r.unpaidCount > 0 && (
                        <p className="text-xs font-normal text-gray-400 dark:text-gray-500">
                          {r.unpaidCount} unpaid {r.unpaidCount === 1 ? 'fee' : 'fees'}
                        </p>
                      )}
                    </td>
                    <td className={`p-4 ${r.overdue > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {r.overdue > 0 ? formatCurrency(r.overdue) : '-'}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{r.lastPaid ? formatDateShort(r.lastPaid) : '-'}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => onViewFees(r)}
                        className="rounded-full border border-[#0b1b62] px-3 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white dark:border-indigo-300 dark:text-indigo-300"
                      >
                        View Fees
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No students match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </>
  )
}
