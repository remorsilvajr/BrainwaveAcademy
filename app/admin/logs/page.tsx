import { createClient } from '@/lib/supabase/server'
import { ActivityLogTable } from '@/components/admin/activity-log-table'

type LogRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  created_at: string
  profiles: { first_name: string; last_name: string; role: string } | null
}

export default async function AdminLogsPage() {
  const supabase = await createClient()

  const { data: logRows } = await supabase
    .from('activity_log')
    .select('id, action, target_table, target_id, created_at, profiles(first_name, last_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<LogRow[]>()

  const logs = logRows ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Activity Log</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A record of account, enrollment, and student-data changes across the system.
        </p>
      </div>

      <ActivityLogTable logs={logs} />
    </div>
  )
}
