import { Users, CheckCircle2, Clock, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { UserManagementTable } from '@/components/admin/user-management-table'

export default async function UserManagementPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*, parent_student(relationship, students(id, first_name, middle_name, last_name))')
    .order('created_at', { ascending: false })
  const users = data ?? []

  const counts = {
    total: users.length,
    active: users.filter((u) => u.account_status === 'active').length,
    inactive: users.filter((u) => u.account_status === 'inactive').length,
    blocked: users.filter((u) => u.account_status === 'blocked').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">User Account Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Provision user accounts, assign roles, and modify account statuses (active, inactive,
          blocked).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 border-l-4 border-l-gray-400 bg-white p-4">
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{counts.total}</p>
          </div>
          <div className="rounded-full bg-gray-100 p-2.5">
            <Users className="h-5 w-5 text-gray-500" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 border-l-4 border-l-green-400 bg-white p-4">
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{counts.active}</p>
          </div>
          <div className="rounded-full bg-green-50 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 border-l-4 border-l-amber-400 bg-white p-4">
          <div>
            <p className="text-sm text-gray-500">Inactive</p>
            <p className="mt-1 text-3xl font-bold text-amber-500">{counts.inactive}</p>
          </div>
          <div className="rounded-full bg-amber-50 p-2.5">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 border-l-4 border-l-red-400 bg-white p-4">
          <div>
            <p className="text-sm text-gray-500">Blocked</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{counts.blocked}</p>
          </div>
          <div className="rounded-full bg-red-50 p-2.5">
            <Ban className="h-5 w-5 text-red-600" />
          </div>
        </div>
      </div>

      <UserManagementTable users={users} />
    </div>
  )
}
