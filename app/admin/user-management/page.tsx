import { Users, CheckCircle2, Clock, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { nowMs } from '@/lib/format'
import { UserManagementTable } from '@/components/admin/user-management-table'

export default async function UserManagementPage() {
  const supabase = await createClient()
  const [{ data }, { data: pendingApplications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, parent_student(relationship, students(id, first_name, middle_name, last_name))')
      .order('created_at', { ascending: false }),
    // Children who exist only as an application (no students row yet) —
    // shown as "Applicants" in the edit modal alongside genuinely enrolled
    // Students, so a parent mid-enrollment doesn't look like they have no
    // children on file at all. See CLAUDE.md's applicant/student note.
    supabase
      .from('applications')
      .select('id, created_parent_id, student_first_name, student_middle_name, student_last_name')
      .not('created_parent_id', 'is', null)
      .is('created_student_id', null),
  ])

  const applicantsByParentId = new Map<string, typeof pendingApplications>()
  for (const application of pendingApplications ?? []) {
    if (!application.created_parent_id) continue
    const existing = applicantsByParentId.get(application.created_parent_id) ?? []
    applicantsByParentId.set(application.created_parent_id, [...existing, application])
  }

  // "Online" is a heuristic, not true presence — this app has no realtime
  // channel tracking actual open connections. middleware.ts pings
  // profiles.last_seen_at at most once per ~60s per authenticated request,
  // so "seen in the last 5 minutes" is a reasonable proxy for "probably
  // still has the portal open" without needing that heavier realtime setup.
  const ONLINE_WINDOW_MS = 5 * 60 * 1000
  const now = nowMs()
  const users = (data ?? []).map((user) => ({
    ...user,
    applicants: applicantsByParentId.get(user.id) ?? [],
    isOnline: !!user.last_seen_at && now - new Date(user.last_seen_at).getTime() < ONLINE_WINDOW_MS,
  }))

  const counts = {
    total: users.length,
    active: users.filter((u) => u.account_status === 'active').length,
    inactive: users.filter((u) => u.account_status === 'inactive').length,
    blocked: users.filter((u) => u.account_status === 'blocked').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">User Account Management</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Provision user accounts, assign roles, and modify account statuses (active, inactive,
          blocked).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-400 dark:border-l-gray-600 bg-white dark:bg-gray-900 p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</p>
          </div>
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2.5">
            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-400 dark:border-l-green-600 bg-white dark:bg-gray-900 p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{counts.active}</p>
          </div>
          <div className="rounded-full bg-green-50 dark:bg-green-950/30 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400 dark:border-l-amber-600 bg-white dark:bg-gray-900 p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
            <p className="mt-1 text-3xl font-bold text-amber-500">{counts.inactive}</p>
          </div>
          <div className="rounded-full bg-amber-50 dark:bg-amber-950/30 p-2.5">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-400 dark:border-l-red-600 bg-white dark:bg-gray-900 p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Blocked</p>
            <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{counts.blocked}</p>
          </div>
          <div className="rounded-full bg-red-50 dark:bg-red-950/30 p-2.5">
            <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      <UserManagementTable users={users} />
    </div>
  )
}
