'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreUserAccounts } from '@/app/admin/user-management/actions'
import { formatDateShort } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { UserEditModal } from '@/components/admin/user-edit-modal'

type LinkedStudent = { id: string; first_name: string; middle_name: string | null; last_name: string }
type Applicant = {
  id: string
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
}

type DeletedAccount = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  role: string
  phone_number: string | null
  date_of_birth: string | null
  relationship_to_student: string | null
  gender: string | null
  avatar_url: string | null
  deleted_at: string
  parent_student?: { relationship: string; students: LinkedStudent | null }[]
  applicants?: Applicant[]
}

const roleBadgeClasses: Record<string, string> = {
  parent: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
  admin: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
}

export function DeletedAccountsTable({ accounts }: { accounts: DeletedAccount[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const filtered = accounts.filter((a) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return `${a.first_name} ${a.last_name}`.toLowerCase().includes(term) || a.email.toLowerCase().includes(term)
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  const viewing = accounts.find((a) => a.id === viewingId) ?? null

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRestore() {
    setError('')
    const ids = Array.from(selected)
    startTransition(async () => {
      try {
        await restoreUserAccounts(ids)
        setSelected(new Set())
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="mt-3 space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Name or email"
        className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
      />

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 p-4">
          <button
            onClick={handleRestore}
            disabled={selected.size === 0 || isPending}
            className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Restoring…' : 'Restore Selected'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">{selected.size} selected</p>
        </div>
        <div className="min-h-[200px] overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="w-10 p-4"></th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Deleted</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((a) => (
                  <tr
                    key={a.id}
                    onDoubleClick={() => setViewingId(a.id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#0b1b62] focus:outline-none focus:ring-2 focus:ring-[#0b1b62]"
                      />
                    </td>
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
                      {a.first_name} {a.last_name}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{a.email}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleBadgeClasses[a.role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                      >
                        {a.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{formatDateShort(a.deleted_at)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingId(a.id)
                        }}
                        className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                      >
                        View Full Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No deleted accounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {viewing && <UserEditModal user={viewing} onClose={() => setViewingId(null)} readOnly />}
    </div>
  )
}
