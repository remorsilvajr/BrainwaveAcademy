import { createClient } from '@/lib/supabase/server'
import { requireSuperAdminPage } from '@/lib/require-super-admin'
import { DoNotReleaseManager, type DnrRow } from '@/components/admin/do-not-release-manager'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'

export default async function AdminDoNotReleasePage() {
  await requireSuperAdminPage()
  const supabase = await createClient()
  const [{ data: entries }, { data: students }] = await Promise.all([
    supabase.from('do_not_release').select('id, student_id, first_name, last_name, note, created_at').order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id')
      .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
      .order('first_name', { ascending: true }),
  ])

  const nameById = new Map((students ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]))
  const rows: DnrRow[] = (entries ?? []).map((e) => ({
    id: e.id,
    firstName: e.first_name,
    lastName: e.last_name,
    note: e.note,
    createdAt: e.created_at,
    studentName: nameById.get(e.student_id) ?? 'A student who is no longer enrolled',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Do-Not-Release List</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          People who must never be handed a particular child, such as someone barred by a court order. Teachers see a red
          &quot;do not release&quot; warning in Pickup Verification if one of these names is looked up, even if the person is also on the
          authorized list, and every admin is notified. Parents cannot see this list.
        </p>
      </div>
      <DoNotReleaseManager
        entries={rows}
        studentOptions={(students ?? []).map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}`, sublabel: s.student_id ?? undefined }))}
      />
    </div>
  )
}
