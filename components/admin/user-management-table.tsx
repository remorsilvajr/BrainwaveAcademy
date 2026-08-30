'use client'

import { useState, useTransition } from 'react'
import { toggleBlockUser, updateAccountStatus } from '@/app/admin/user-management/actions'
import { formatDateShort } from '@/lib/format'
import { UserEditModal } from '@/components/admin/user-edit-modal'

type LinkedStudent = { id: string; first_name: string; middle_name: string | null; last_name: string }

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
  account_status: string
  created_at: string
  avatar_url: string | null
  parent_student?: { relationship: string; students: LinkedStudent | null }[]
}

const roleBadgeClasses: Record<string, string> = {
  parent: 'bg-sky-50 text-sky-700',
  teacher: 'bg-pink-50 text-pink-700',
  admin: 'bg-purple-50 text-purple-700',
}

export function UserManagementTable({ users }: { users: Profile[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // See students-table.tsx for why this is derived rather than its own
  // synced state.
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const editingUser = editingUserId ? (users.find((u) => u.id === editingUserId) ?? null) : null
  const [confirmingBlockId, setConfirmingBlockId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  function handleToggleBlock(user: Profile) {
    startTransition(async () => {
      await toggleBlockUser(user.id, user.account_status)
    })
    setConfirmingBlockId(null)
  }

  function handleStatusChange(user: Profile, status: string) {
    startTransition(async () => {
      await updateAccountStatus(user.id, status as 'active' | 'inactive')
    })
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_160px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">User Details</th>
              <th className="p-4 font-medium">Assigned Role</th>
              <th className="p-4 font-medium">Account Status</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="min-w-[260px] p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td className="p-4">
                    <p className="font-medium text-gray-900">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        roleBadgeClasses[u.role] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.account_status}
                      disabled={u.account_status === 'blocked' || isPending}
                      onChange={(e) => handleStatusChange(u, e.target.value)}
                      className={`rounded-lg border px-2 py-1 text-sm capitalize disabled:opacity-60 ${
                        u.account_status === 'active'
                          ? 'border-green-200 text-green-700'
                          : u.account_status === 'blocked'
                            ? 'border-red-200 text-red-700'
                            : 'border-amber-200 text-amber-700'
                      }`}
                    >
                      {u.account_status === 'blocked' && <option value="blocked">Blocked</option>}
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-500">{formatDateShort(u.created_at)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUserId(u.id)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {confirmingBlockId === u.id ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                          <span className="text-gray-600">Block this user?</span>
                          <button
                            onClick={() => setConfirmingBlockId(null)}
                            className="font-semibold text-gray-500 underline"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u)}
                            className="font-semibold text-red-700 underline"
                          >
                            Yes, Block
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            u.account_status === 'blocked'
                              ? handleToggleBlock(u)
                              : setConfirmingBlockId(u.id)
                          }
                          disabled={isPending}
                          className={`rounded border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                            u.account_status === 'blocked'
                              ? 'border-green-300 text-green-700 hover:bg-green-50'
                              : 'border-red-300 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {u.account_status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <UserEditModal user={editingUser} onClose={() => setEditingUserId(null)} />
      )}
    </>
  )
}
