'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { usePagination } from '@/lib/use-pagination'
import { useSort, compareStrings, type SortOption } from '@/lib/use-sort'
import { formatDateLong } from '@/lib/format'

export type AttendanceRecordRow = {
  id: string
  date: string // YYYY-MM-DD
  name: string
  status: 'present' | 'late' | 'absent'
  // A student's program, or the teacher's classroom label. Empty when there is none.
  group: string
}

const STATUS_STYLES: Record<AttendanceRecordRow['status'], string> = {
  present: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

const NO_GROUP = '__none__'

const sortOptions: SortOption<AttendanceRecordRow>[] = [
  { value: 'newest', label: 'Newest', compare: (a, b) => b.date.localeCompare(a.date) || compareStrings(a.name, b.name) },
  { value: 'oldest', label: 'Oldest', compare: (a, b) => a.date.localeCompare(b.date) || compareStrings(a.name, b.name) },
  { value: 'name', label: 'Name A-Z', compare: (a, b) => compareStrings(a.name, b.name) || b.date.localeCompare(a.date) },
]

// Every attendance record on file, for the students (teacher and admin) or the teachers
// (admin), with search, status/program/date-range filters and the standard sort and
// pager. Read-only: recording happens on the Check-in tab.
export function AttendanceRecords({
  rows,
  subject,
  groupLabel,
  capped,
}: {
  rows: AttendanceRecordRow[]
  subject: 'student' | 'teacher'
  // Label for the group filter (e.g. "Program" or "Classroom").
  groupLabel: string
  // True when more records exist than were loaded.
  capped: boolean
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [group, setGroup] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const groups = [...new Set(rows.map((r) => r.group).filter(Boolean))].sort(compareStrings)
  const hasUngrouped = rows.some((r) => !r.group)
  const term = search.trim().toLowerCase()

  const filtered = rows.filter((r) => {
    if (term && !r.name.toLowerCase().includes(term)) return false
    if (status !== 'all' && r.status !== status) return false
    if (group === NO_GROUP ? !!r.group : group !== 'all' && r.group !== group) return false
    if (from && r.date < from) return false
    if (to && r.date > to) return false
    return true
  })

  const { sorted, sortKey, setSortKey, options } = useSort(filtered, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    sorted,
    [term, status, group, from, to, sortKey].join('|')
  )

  const count = (s: AttendanceRecordRow['status']) => filtered.filter((r) => r.status === s).length
  const noun = subject === 'student' ? 'student' : 'teacher'
  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ${noun} name`}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{groupLabel}</label>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={inputClass}>
            <option value="all">All</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            {hasUngrouped && <option value={NO_GROUP}>None</option>}
          </select>
        </div>
        <div>
          <label className={labelClass}>From</label>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{filtered.length} records</span>
          <span className={`rounded-full px-3 py-1 ${STATUS_STYLES.present}`}>{count('present')} present</span>
          <span className={`rounded-full px-3 py-1 ${STATUS_STYLES.late}`}>{count('late')} late</span>
          <span className={`rounded-full px-3 py-1 ${STATUS_STYLES.absent}`}>{count('absent')} absent</span>
        </div>
        <div className="w-64">
          <SortSelect value={sortKey} onChange={setSortKey} options={options} />
        </div>
      </div>

      <div className="min-h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {totalItems === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            {rows.length === 0 ? 'No attendance has been recorded yet.' : 'No records match these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {formatDateLong(r.date)}
                    {r.group ? ` · ${r.group}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {capped && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Showing the most recent {rows.length.toLocaleString()} records.</p>
      )}
    </div>
  )
}
