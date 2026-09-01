import { createClient } from '@/lib/supabase/server'
import { ActivityLogTable } from '@/components/admin/activity-log-table'

type LogRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  created_at: string
  profiles: { first_name: string; last_name: string; email: string; role: string } | null
}

export default async function AdminLogsPage() {
  const supabase = await createClient()

  const { data: logRows } = await supabase
    .from('activity_log')
    .select('id, action, target_table, target_id, created_at, profiles(first_name, last_name, email, role)')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<LogRow[]>()

  const logRowsData = logRows ?? []

  // `target_id` is a generic polymorphic reference (target_table names which
  // table it points into — profiles, students, attendance, etc.), not a
  // declared FK Supabase can auto-join the way it does actor_id above, so
  // resolving "which user/student is this actually about" takes a separate
  // batched lookup per target table rather than one join. Scoped to
  // profiles and students specifically — the two cases an admin actually
  // needs a name for (every account-management action targets profiles;
  // several student-record actions target students) — rather than every
  // target_table logActivity uses (attendance/milestones/announcements/etc.
  // still show their raw table+id in the Details modal, just not resolved
  // to a friendly name inline).
  const profileTargetIds = [...new Set(logRowsData.filter((l) => l.target_table === 'profiles' && l.target_id).map((l) => l.target_id!))]
  const studentTargetIds = [...new Set(logRowsData.filter((l) => l.target_table === 'students' && l.target_id).map((l) => l.target_id!))]

  const [{ data: targetProfiles }, { data: targetStudents }] = await Promise.all([
    profileTargetIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, email').in('id', profileTargetIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; email: string }[] }),
    studentTargetIds.length > 0
      ? supabase.from('students').select('id, first_name, last_name').in('id', studentTargetIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ])

  const profileById = new Map((targetProfiles ?? []).map((p) => [p.id, p]))
  const studentById = new Map((targetStudents ?? []).map((s) => [s.id, s]))

  function resolveTargetLabel(log: LogRow): string | null {
    if (log.target_table === 'profiles' && log.target_id) {
      const p = profileById.get(log.target_id)
      return p ? `${p.first_name} ${p.last_name} (${p.email})` : null
    }
    if (log.target_table === 'students' && log.target_id) {
      const s = studentById.get(log.target_id)
      return s ? `${s.first_name} ${s.last_name}` : null
    }
    return null
  }

  const logs = logRowsData.map((log) => ({ ...log, targetLabel: resolveTargetLabel(log) }))

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
