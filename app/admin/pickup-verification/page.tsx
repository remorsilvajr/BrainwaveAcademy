import { Users } from 'lucide-react'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { createClient } from '@/lib/supabase/server'
import { PickupVerificationPanel } from '@/components/teacher/pickup-verification-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { loadAllPickupsWithPhotos } from '@/lib/pickup-list'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { AuthorizedPickupManager } from '@/components/parent/authorized-pickup-manager'
import { PickupStudentPicker } from '@/components/admin/pickup-student-picker'
import { PickupHistory } from '@/components/pickup/pickup-history'
import { loadPickupHistory } from '@/lib/pickup-history'

function Header({ tab }: { tab: string }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Pickup Verification</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search everyone registered to pick up a child, confirm who&apos;s allowed to collect them, and record each pickup.
        </p>
      </div>
      <AttendanceTabLinks
        basePath="/admin/pickup-verification"
        active={tab}
        tabs={[
          { key: 'verify', label: 'Verify Pickup' },
          { key: 'history', label: 'Pickup History' },
          { key: 'manage', label: 'Manage Pickup People' },
        ]}
      />
    </>
  )
}

export default async function AdminPickupVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; student?: string }>
}) {
  const { tab: tabParam, student: studentParam } = await searchParams
  const tab = tabParam === 'manage' ? 'manage' : tabParam === 'history' ? 'history' : 'verify'
  const supabase = await createClient()

  if (tab === 'history') {
    const { rows, capped } = await loadPickupHistory(supabase)
    return (
      <div className="space-y-6">
        <Header tab={tab} />
        <PickupHistory rows={rows} capped={capped} />
      </div>
    )
  }

  const [{ data: students }, pickups] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name')
      .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
      .order('first_name', { ascending: true }),
    loadAllPickupsWithPhotos(supabase),
  ])

  // The Do-Not-Release list is a hidden feature for now (super admin only), so it is not checked here.
  // A withdrawn or graduated child's pickup people aren't on the verification list.
  const enrolledIds = new Set((students ?? []).map((s) => s.id))
  const managedStudent = (students ?? []).find((s) => s.id === studentParam) ?? null

  return (
    <div className="space-y-6">
      <Header tab={tab} />

      {(students ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No Students on File Yet" description="Once students are enrolled, their authorized pickup lists appear here." />
      ) : tab === 'verify' ? (
        <PickupVerificationPanel
          students={students ?? []}
          pickups={pickups.filter((p) => enrolledIds.has(p.student_id))}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add, edit or remove a child&apos;s pickup people and their photos. The child&apos;s parents are notified of every change.
          </p>
          <PickupStudentPicker
            value={managedStudent?.id ?? null}
            options={(students ?? []).map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))}
          />
          {managedStudent && (
            <AuthorizedPickupManager
              students={[managedStudent]}
              pickups={pickups.filter((p) => p.student_id === managedStudent.id)}
            />
          )}
        </div>
      )}
    </div>
  )
}
