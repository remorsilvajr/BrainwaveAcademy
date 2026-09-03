'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type LogRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  created_at: string
  profiles: { first_name: string; last_name: string; email: string; role: string } | null
  // Resolved by app/admin/logs/page.tsx for target_table 'profiles'/
  // 'students' only — null for every other target_table (attendance,
  // milestones, announcements, etc.), which still show their raw
  // table+id in the Details modal, just not resolved to a friendly name.
  targetLabel: string | null
}

function LogDetailModal({ log, onClose }: { log: LogRow; onClose: () => void }) {
  const exactTime = new Date(log.created_at).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'medium',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Action</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{log.action}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Performed by</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name} (${log.profiles.role})` : 'System / Anonymous'}
            </p>
            {log.profiles && <p className="text-xs text-gray-500 dark:text-gray-400">{log.profiles.email}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Target</p>
            {log.targetLabel ? (
              <p className="font-medium text-gray-900 dark:text-gray-100">{log.targetLabel}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {log.target_table ? 'No name on file for this target — shown as raw table + ID below.' : 'None'}
              </p>
            )}
            {log.target_table && (
              <p className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500 break-all">
                {log.target_table} · {log.target_id}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">When</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{exactTime}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(log.created_at)}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  )
}

const roleBadgeClasses: Record<string, string> = {
  admin: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/30 text-pink-700',
  parent: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
}

export function ActivityLogTable({ logs }: { logs: LogRow[] }) {
  const [search, setSearch] = useState('')
  const [detailLog, setDetailLog] = useState<LogRow | null>(null)

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const actorName = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'system anonymous'
    return (
      actorName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.target_table ?? '').toLowerCase().includes(term) ||
      (log.targetLabel ?? '').toLowerCase().includes(term)
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
          placeholder="Actor name, action, target table, or target name"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-4 font-medium">Date / Time</th>
              <th className="p-4 font-medium">Actor</th>
              <th className="p-4 font-medium">Action</th>
              <th className="p-4 font-medium">Target</th>
              <th className="p-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.length > 0 ? (
              pageItems.map((log) => (
                <tr
                  key={log.id}
                  onDoubleClick={() => setDetailLog(log)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
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
                  <td className="p-4 align-top text-sm">
                    {log.targetLabel ? (
                      <span className="font-medium text-gray-900 dark:text-gray-100">{log.targetLabel}</span>
                    ) : log.target_table ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {log.target_table}
                        {log.target_id && <span className="ml-1">· {log.target_id.slice(0, 8)}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <button
                      onClick={() => setDetailLog(log)}
                      className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-500">
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

      {detailLog && <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}
    </>
  )
}
