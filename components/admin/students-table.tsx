'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { User as UserIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { UnpaidFee } from '@/lib/payments'
import { StudentRecordModal } from '@/components/admin/student-record-modal'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, compareDates, type SortOption } from '@/lib/use-sort'

type Guardian = { name: string; relationship: string | null; phone: string | null; email: string | null }
type DocRow = { document_type: string; file_url: string; verification_status: string }

type Student = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
  classroom_id: string | null
  classroomName: string | null
  program_options: string[]
  guardians: Guardian[]
  documents: DocRow[]
  outstanding: number
  overdue: number
  unpaidFees: UnpaidFee[]
}

type Classroom = { id: string; name: string; slug: string; min_age_years: number | null; max_age_years: number | null }

export function StudentsTable({ students, classrooms }: { students: Student[]; classrooms: Classroom[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // Holds an id, not the row itself — router.refresh() (after editing a
  // student, or a status cascade from User Management) re-fetches this
  // page's server data and passes down a brand-new `students` array each
  // time, so deriving `selected` from it on every render (below) means the
  // open modal always reflects the latest data instead of going stale
  // until closed and reopened.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (students.find((s) => s.id === selectedId) ?? null) : null

  const statuses = useMemo(
    () => Array.from(new Set(students.map((s) => s.enrollment_status))),
    [students]
  )

  const filtered = students.filter((s) => {
    if (statusFilter !== 'all' && s.enrollment_status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const guardianMatch = s.guardians.some((g) => g.name.toLowerCase().includes(term))
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
      (s.student_id ?? '').toLowerCase().includes(term) ||
      guardianMatch
    )
  })

  const sortOptions: SortOption<Student>[] = useMemo(
    () => [
      { value: 'name_asc', label: 'Name (A-Z)', compare: (a, b) => compareStrings(`${a.first_name} ${a.last_name}`, `${b.first_name} ${b.last_name}`) },
      { value: 'name_desc', label: 'Name (Z-A)', compare: (a, b) => compareStrings(`${b.first_name} ${b.last_name}`, `${a.first_name} ${a.last_name}`) },
      { value: 'dob_desc', label: 'Date of Birth (Youngest)', compare: (a, b) => compareDates(b.date_of_birth, a.date_of_birth) },
      { value: 'outstanding_desc', label: 'Outstanding (High-Low)', compare: (a, b) => b.outstanding - a.outstanding },
      { value: 'dob_asc', label: 'Date of Birth (Oldest)', compare: (a, b) => compareDates(a.date_of_birth, b.date_of_birth) },
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
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px_260px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search Students</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student Name, ID, or Parent Name"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
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
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Guardian Contact</th>
              <th className="p-4 font-medium">Classroom</th>
              <th className="p-4 font-medium">Outstanding</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.length > 0 ? (
              pageItems.map((s) => {
                const guardian = s.guardians[0]
                return (
                  <tr
                    key={s.id}
                    onDoubleClick={() => setSelectedId(s.id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                            <UserIcon className="h-4 w-4" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-[#0b1b62] dark:text-indigo-300">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{s.student_id ?? '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {guardian ? (
                        <>
                          <p>{guardian.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{guardian.phone}</p>
                        </>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {s.classroomName ?? <span className="text-gray-400 dark:text-gray-500">Unassigned</span>}
                    </td>
                    <td className="p-4">
                      <p
                        className={`font-medium ${
                          s.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {formatCurrency(s.outstanding)}
                      </p>
                      {s.overdue > 0 && (
                        <p className="text-xs text-red-500 dark:text-red-400">{formatCurrency(s.overdue)} overdue</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          s.enrollment_status === 'active'
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {s.enrollment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedId(s.id)}
                          className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                        >
                          Open Full Record
                        </button>
                        <Link
                          href={`/admin/students/${s.id}/report`}
                          className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          Export Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <StudentRecordModal student={selected} classrooms={classrooms} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
