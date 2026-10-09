'use client'

import { useState } from 'react'
import { Clock, QrCode, Search, UserCheck } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, type SortOption } from '@/lib/use-sort'
import { formatManilaDate, formatManilaTime, manilaDateKey, type PickupRecordRow } from '@/lib/pickup-history'

const sortOptions: SortOption<PickupRecordRow>[] = [
  { value: 'newest', label: 'Newest', compare: (a, b) => compareStrings(b.picked_up_at, a.picked_up_at) },
  { value: 'oldest', label: 'Oldest', compare: (a, b) => compareStrings(a.picked_up_at, b.picked_up_at) },
  { value: 'child', label: 'Child (A-Z)', compare: (a, b) => compareStrings(a.student_name, b.student_name) || compareStrings(b.picked_up_at, a.picked_up_at) },
]

// The pickup history (who collected which child, with the date and time, and who
// recorded it). Shared by admin, teachers (every child) and parents (their own).
// Read-only: pickups are recorded from Pickup Verification.
export function PickupHistory({ rows, capped, showChildFilter = true }: { rows: PickupRecordRow[]; capped: boolean; showChildFilter?: boolean }) {
  const [search, setSearch] = useState('')
  const [child, setChild] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const children = [...new Map(rows.map((r) => [r.student_id, r.student_name])).entries()].sort((a, b) => compareStrings(a[1], b[1]))
  const term = search.trim().toLowerCase()

  const filtered = rows.filter((r) => {
    if (term && !`${r.student_name} ${r.person_name}`.toLowerCase().includes(term)) return false
    if (child !== 'all' && r.student_id !== child) return false
    const day = manilaDateKey(r.picked_up_at)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })

  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, [term, child, from, to, sortKey].join('|'))

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${showChildFilter && children.length > 1 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <div className="lg:col-span-2">
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Child or person's name" className={`${inputClass} pl-9`} />
          </div>
        </div>
        {showChildFilter && children.length > 1 && (
          <div>
            <label className={labelClass}>Child</label>
            <select value={child} onChange={(e) => setChild(e.target.value)} className={inputClass}>
              <option value="all">All children</option>
              {children.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* From / To side by side on a phone; separate grid cells from sm up. */}
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div>
            <label className={labelClass}>From</label>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {filtered.length} {filtered.length === 1 ? 'pickup' : 'pickups'}
        </span>
        <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
      </div>

      <div className="min-h-[360px] rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {totalItems === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            {rows.length === 0 ? 'No pickups have been recorded yet.' : 'No pickups match these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {`${r.student_name} picked up by ${r.person_name}${r.relationship ? ` (${r.relationship})` : ''}`}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      {r.method === 'scan' ? <QrCode className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      {r.method === 'scan' ? 'Pickup ID scanned' : 'Name checked'}
                    </span>
                    <span>{`Recorded by ${r.recorded_by_name}`}</span>
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                    <Clock className="h-3.5 w-3.5" />
                    {formatManilaTime(r.picked_up_at)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatManilaDate(r.picked_up_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {capped && <p className="text-xs text-gray-500 dark:text-gray-400">Showing the most recent {rows.length.toLocaleString()} pickups.</p>}
    </div>
  )
}
