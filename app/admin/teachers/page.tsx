import { createClient } from '@/lib/supabase/server'
import { TeachersTable } from '@/components/admin/teachers-table'

export default async function TeachersPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('profiles')
    .select(
      'id, first_name, middle_name, last_name, email, phone_number, date_of_birth, gender, account_id, account_status, avatar_url'
    )
    .eq('role', 'teacher')
    .order('first_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Teacher Directory</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search, inspect, and update teacher records.
        </p>
      </div>
      <TeachersTable teachers={teachers ?? []} />
    </div>
  )
}
