'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  toggleBlockUser,
  updateAccountStatus,
  forceLogoutUser,
  deleteUserAccount,
} from '@/app/admin/user-management/actions'
import { formatDateShort } from '@/lib/format'
import { UserEditModal } from '@/components/admin/user-edit-modal'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { canModerateAccount, type AccountForModeration } from '@/lib/permissions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type LinkedStudent = { id: string; first_name: string; middle_name: string | null; last_name: string }
type Applicant = {
  id: string
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
}

type Profile = {
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
  account_status: string
  created_at: string
  avatar_url: string | null
  isOnline: boolean
  is_super_admin: boolean
  parent_student?: { relationship: string; students: LinkedStudent | null }[]
  applicants?: Applicant[]
}

const roleBadgeClasses: Record<string, string> = {
  parent: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  teacher: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
  admin: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
}

export function UserManagementTable({
  users,
  currentUser,
}: {
  users: Profile[]
  currentUser: AccountForModeration & { id: string }
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // See students-table.tsx for why this is derived rather than its own
  // synced state.
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const editingUser = editingUserId ? (users.find((u) => u.id === editingUserId) ?? null) : null
  const [confirmingBlockId, setConfirmingBlockId] = useState<string | null>(null)
  const confirmingBlockUser = confirmingBlockId ? (users.find((u) => u.id === confirmingBlockId) ?? null) : null
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const confirmingDeleteUser = confirmingDeleteId ? (users.find((u) => u.id === confirmingDeleteId) ?? null) : null
  const [actionError, setActionError] = useState('')
  const [isPending, startTransition] = useTransition()

  // The Online indicator only reflects however-fresh `users` was when this
  // page last rendered — reported live as feeling stuck/stale, since
  // nothing was re-fetching it without an actual navigation. This alone
  // doesn't make it real-time (still the same last_seen_at heuristic,
  // still only as fresh as the last refresh), but keeps it from looking
  // frozen while an admin is just sitting on this page watching it. 10s
  // (not the original 20s) after a second live report that 20s felt like
  // "not updating at all" rather than "updating slowly" — paired with the
  // manual "Refresh Now" button below for whenever even that's too slow to
  // wait on. search/roleFilter/statusFilter/editingUserId/confirmingBlockId/
  // confirmingDeleteId are all local state untouched by router.refresh(),
  // so neither this nor the manual button resets an open modal, an
  // in-progress block/delete confirmation, or the current filters.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 10000)
    return () => clearInterval(interval)
  }, [router])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && u.account_status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    filtered,
    `${search}|${roleFilter}|${statusFilter}`
  )

  function handleToggleBlock(user: Profile) {
    setActionError('')
    startTransition(async () => {
      try {
        await toggleBlockUser(user.id, user.account_status)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
    setConfirmingBlockId(null)
  }

  function handleDelete(user: Profile) {
    setActionError('')
    startTransition(async () => {
      try {
        await deleteUserAccount(user.id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
    setConfirmingDeleteId(null)
  }

  function handleStatusChange(user: Profile, status: string) {
    startTransition(async () => {
      await updateAccountStatus(user.id, status as 'active' | 'inactive')
    })
  }

  const [loggingOutId, setLoggingOutId] = useState<string | null>(null)
  const [loggedOutId, setLoggedOutId] = useState<string | null>(null)

  async function handleForceLogout(user: Profile) {
    setLoggingOutId(user.id)
    try {
      await forceLogoutUser(user.id)
      setLoggedOutId(user.id)
      setTimeout(() => setLoggedOutId(null), 2000)
    } finally {
      setLoggingOutId(null)
    }
  }

  const optionClasses = "bg-white text-slate-900 dark:bg-gray-800 dark:text-slate-100"
  const [isRefreshing, startRefresh] = useTransition()

  return (
    <>
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Online status refreshes automatically every 10s.
          </p>
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={isRefreshing}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh Now'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_160px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email"
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400 px-3 py-2 text-sm"
            >
              <option value="all" className={optionClasses}>All Roles</option>
              <option value="parent" className={optionClasses}>Parent</option>
              <option value="teacher" className={optionClasses}>Teacher</option>
              <option value="admin" className={optionClasses}>Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400 px-3 py-2 text-sm"
            >
              <option value="all" className={optionClasses}>All Statuses</option>
              <option value="active" className={optionClasses}>Active</option>
              <option value="inactive" className={optionClasses}>Inactive</option>
              <option value="blocked" className={optionClasses}>Blocked</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="p-4 font-medium">User Details</th>
                <th className="p-4 font-medium">Assigned Role</th>
                <th className="p-4 font-medium">Account Status</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="min-w-[340px] p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((u) => (
                  <tr key={u.id}>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          title={u.isOnline ? 'Online' : 'Offline'}
                        />
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {u.first_name} {u.last_name}
                        </p>
                      </div>
                      <p className="ml-3.5 text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          u.is_super_admin
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : (roleBadgeClasses[u.role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')
                        }`}
                      >
                        {u.is_super_admin ? 'Super Admin' : u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.account_status === 'blocked' ? (
                        <span className="inline-block rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 px-2 py-1 text-sm capitalize text-red-700 dark:text-red-400">
                          Blocked
                        </span>
                      ) : (
                        <select
                          value={u.account_status}
                          disabled={isPending}
                          onChange={(e) => handleStatusChange(u, e.target.value)}
                          className={`rounded-lg border px-2 py-1 text-sm capitalize disabled:opacity-60 focus:outline-none ${u.account_status === 'active'
                              ? 'border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-green-700 dark:text-green-400'
                              : 'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300'
                            }`}
                        >
                          <option value="active" className={optionClasses}>Active</option>
                          <option value="inactive" className={optionClasses}>Inactive</option>
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{formatDateShort(u.created_at)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUserId(u.id)}
                          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        {u.account_status !== 'blocked' && (
                          <button
                            onClick={() => handleForceLogout(u)}
                            disabled={loggingOutId === u.id}
                            title="Ends their current session — they can log back in right away"
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                          >
                            {loggingOutId === u.id ? 'Logging Out…' : loggedOutId === u.id ? 'Logged Out ✓' : 'Log Out'}
                          </button>
                        )}
                        {u.account_status === 'blocked' ? (
                          // Unblocking is never gated by canModerateAccount —
                          // see toggleBlockUser's own comment for why an
                          // already-blocked protected account (e.g. blocked
                          // before being promoted to super admin) still needs
                          // to be recoverable rather than permanently stuck.
                          <button
                            onClick={() => handleToggleBlock(u)}
                            disabled={isPending}
                            className="rounded border border-green-300 dark:border-green-700 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 disabled:opacity-60"
                          >
                            Unblock
                          </button>
                        ) : !canModerateAccount(currentUser, u) ? (
                          <span
                            title={
                              u.is_super_admin
                                ? "Super admin accounts can't be blocked or deleted."
                                : 'Only a super admin can block or delete an admin account.'
                            }
                            className="cursor-default rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500"
                          >
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmingBlockId(u.id)}
                            disabled={isPending}
                            className="rounded border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
                          >
                            Block
                          </button>
                        )}
                        {canModerateAccount(currentUser, u) && (
                          <button
                            onClick={() => setConfirmingDeleteId(u.id)}
                            disabled={isPending}
                            className="rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No users match your filters.
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

      {editingUser && (
        <UserEditModal user={editingUser} onClose={() => setEditingUserId(null)} />
      )}

      {confirmingBlockUser && (
        <ConfirmDialog
          title="Block this account?"
          description={`${confirmingBlockUser.first_name} ${confirmingBlockUser.last_name} (${confirmingBlockUser.email}) will immediately lose access and be signed out of any active session. You can unblock them again at any time.`}
          confirmLabel="Yes, Block Account"
          isPending={isPending}
          onConfirm={() => handleToggleBlock(confirmingBlockUser)}
          onCancel={() => setConfirmingBlockId(null)}
        />
      )}

      {confirmingDeleteUser && (
        <ConfirmDialog
          title="Delete this account?"
          description={`${confirmingDeleteUser.first_name} ${confirmingDeleteUser.last_name} (${confirmingDeleteUser.email}) will be hidden from User Management and unable to log in. Nothing is erased — a super admin can restore it from Deleted Items.`}
          confirmLabel="Yes, Delete Account"
          isPending={isPending}
          onConfirm={() => handleDelete(confirmingDeleteUser)}
          onCancel={() => setConfirmingDeleteId(null)}
        />
      )}
    </>
  )
}