import { Users } from 'lucide-react'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { createClient } from '@/lib/supabase/server'
import { PickupVerificationPanel } from '@/components/teacher/pickup-verification-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { loadAllPickupsWithPhotos } from '@/lib/pickup-list'

export default async function AdminPickupVerificationPage() {
  const supabase = await createClient()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Pickup Verification</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search everyone registered to pick up a child and confirm who&apos;s allowed to collect them.
        </p>
      </div>

      {(students ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No Students on File Yet" description="Once students are enrolled, their authorized pickup lists appear here." />
      ) : (
        <PickupVerificationPanel
          students={students ?? []}
          pickups={pickups.filter((p) => enrolledIds.has(p.student_id))}
        />
      )}
    </div>
  )
}
