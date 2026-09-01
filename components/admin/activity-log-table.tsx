'use client'

import { useState } from 'react'
import { formatRelativeTime } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type LogRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  created_at: string
  profiles: { first_name: string; last_name: string; role: string } | null
}

const roleBadgeClasses: Record<string, string> = {
  admin: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/30 text-pink-700',
  parent: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
}

export function ActivityLogTable({ logs }: { logs: LogRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const actorName = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'system anonymous'
    return (
      actorName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.target_table ?? '').toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Actor name, action, or target table"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-4 font-medium">Date / Time</th>
              <th className="p-4 font-medium">Actor</th>
              <th className="p-4 font-medium">Action</th>
              <th className="p-4 font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.length > 0 ? (
              pageItems.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap p-4 align-top text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(log.created_at)}
                  </td>
                  <td className="p-4 align-top">
                    {log.profiles ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {log.profiles.first_name} {log.profiles.last_name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            roleBadgeClasses[log.profiles.role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {log.profiles.role}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">System / Anonymous</span>
                    )}
                  </td>
                  <td className="p-4 align-top text-gray-900 dark:text-gray-100">{log.action}</td>
                  <td className="p-4 align-top text-xs text-gray-400 dark:text-gray-500">
                    {log.target_table ? (
                      <>
                        {log.target_table}
                        {log.target_id && <span className="ml-1">· {log.target_id.slice(0, 8)}</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500">
                  {logs.length === 0 ? 'No activity recorded yet.' : 'No activity matches your search.'}
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
    </>
  )
}
