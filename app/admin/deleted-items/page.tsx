import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DeletedAccountsTable } from '@/components/admin/deleted-accounts-table'
import { DeletedApplicationsTable } from '@/components/admin/deleted-applications-table'

// Super-admin-only, both to view and to restore — a regular admin can
// still delete an account or enrollment request (subject to
// canModerateAccount for accounts), but only a super admin can see where
// it went or bring it back. Not gated in middleware.ts (that only does
// broad role-based routing for /admin, /teacher, /parent) — checked here
// instead, same as any other super-admin-only surface would be.
export default async function DeletedItemsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!currentProfile?.is_super_admin) {
    redirect('/admin')
  }

  const [{ data: deletedAccounts }, { data: deletedApplications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('applications')
      .select(
        'id, application_ref, student_first_name, student_last_name, parent_first_name, parent_last_name, parent_email, status, deleted_at'
      )
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Deleted Items</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nothing here is erased from the database — deleting an account or enrollment request just
          hides it everywhere else. Select items below and restore them whenever you need to.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deleted Accounts</h2>
        <DeletedAccountsTable accounts={deletedAccounts ?? []} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deleted Enrollment Requests</h2>
        <DeletedApplicationsTable applications={deletedApplications ?? []} />
      </div>
    </div>
  )
}
