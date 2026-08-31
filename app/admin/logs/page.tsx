import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/format'

type LogRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  created_at: string
  profiles: { first_name: string; last_name: string; role: string } | null
}

const roleBadgeClasses: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-700',
  teacher: 'bg-pink-50 text-pink-700',
  parent: 'bg-sky-50 text-sky-700',
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
        <h1 className="text-2xl font-bold text-[#0b1b62]">Activity Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          A record of account, enrollment, and student-data changes across the system.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">Date / Time</th>
              <th className="p-4 font-medium">Actor</th>
              <th className="p-4 font-medium">Action</th>
              <th className="p-4 font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap p-4 align-top text-gray-500">
                    {formatRelativeTime(log.created_at)}
                  </td>
                  <td className="p-4 align-top">
                    {log.profiles ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {log.profiles.first_name} {log.profiles.last_name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            roleBadgeClasses[log.profiles.role] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {log.profiles.role}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">System / Anonymous</span>
                    )}
                  </td>
                  <td className="p-4 align-top text-gray-900">{log.action}</td>
                  <td className="p-4 align-top text-xs text-gray-400">
                    {log.target_table ? (
                      <>
                        {log.target_table}
                        {log.target_id && <span className="ml-1">· {log.target_id.slice(0, 8)}</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
