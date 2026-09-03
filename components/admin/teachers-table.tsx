'use client'

import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'
import { TeacherRecordModal } from '@/components/admin/teacher-record-modal'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type Teacher = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  gender: string | null
  account_id: string | null
  account_status: string
  avatar_url: string | null
}

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  blocked: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

export function TeachersTable({ teachers }: { teachers: Teacher[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // Holds an id, not the row itself — same reasoning as StudentsTable: after
  // an edit, router.refresh() re-fetches this page's server data and passes
  // down a brand-new `teachers` array, so deriving `selected` from it on
  // every render keeps an open modal showing the latest data.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (teachers.find((t) => t.id === selectedId) ?? null) : null

  const filtered = teachers.filter((t) => {
    if (statusFilter !== 'all' && t.account_status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      (t.account_id ?? '').toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    filtered,
    `${search}|${statusFilter}`
  )

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search Teachers</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or Account ID"
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="p-4 font-medium">Teacher</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((t) => (
                  <tr
                    key={t.id}
                    onDoubleClick={() => setSelectedId(t.id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {t.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                            <UserIcon className="h-4 w-4" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-[#0b1b62] dark:text-indigo-300">
                            {t.first_name} {t.last_name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t.account_id ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      <p>{t.email}</p>
                      {t.phone_number && <p className="text-xs text-gray-500 dark:text-gray-400">{t.phone_number}</p>}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          statusBadgeClasses[t.account_status] ?? statusBadgeClasses.inactive
                        }`}
                      >
                        {t.account_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                      >
                        Open Full Record
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No teachers match your search.
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
        <TeacherRecordModal teacher={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
