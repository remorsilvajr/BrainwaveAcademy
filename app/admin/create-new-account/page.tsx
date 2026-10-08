import { createClient } from '@/lib/supabase/server'
import { CreateAccountForm } from '@/components/admin/create-account-form'

export default async function CreateNewAccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: actor } = await supabase.from('profiles').select('is_super_admin').eq('id', user?.id ?? '').single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Create New Account</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Provision a new user account and assign its role.
        </p>
      </div>

      <CreateAccountForm canCreateAdmin={!!actor?.is_super_admin} />
    </div>
  )
}
