import { ShieldCheck } from 'lucide-react'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmptyState } from '@/components/ui/empty-state'
import { PICKUP_PHOTO_URL_TTL_SECONDS } from '@/lib/pickup-list'
import { pickupIdCode, pickupIdLabel } from '@/lib/pickup-id'
import { AuthorizedPickupManager } from '@/components/parent/authorized-pickup-manager'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { PickupHistory } from '@/components/pickup/pickup-history'
import { loadPickupHistory } from '@/lib/pickup-history'

function Header({ tab }: { tab: string }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Authorized Pickup</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Register the people allowed to pick up your child, and see each time your child was picked up. Teachers and admin
          check this list at pickup time.
        </p>
      </div>
      <AttendanceTabLinks
        basePath="/parent/pickup"
        active={tab}
        tabs={[
          { key: 'people', label: 'Authorized People' },
          { key: 'history', label: 'Pickup History' },
        ]}
      />
    </>
  )
}

export default async function AuthorizedPickupPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'history' ? 'history' : 'people'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: linkedStudentIds } = await supabase.from('parent_student').select('student_id').eq('parent_id', user?.id ?? '')
  const studentIds = (linkedStudentIds ?? []).map((row) => row.student_id)

  // Every linked child's history, including a child who has since left the school.
  if (tab === 'history') {
    const { rows, capped } = await loadPickupHistory(supabase, studentIds)
    return (
      <div className="space-y-6">
        <Header tab={tab} />
        <PickupHistory rows={rows} capped={capped} />
      </div>
    )
  }

  const [{ data: students }, { data: pickups }] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', studentIds)
          .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
          .order('first_name', { ascending: true })
      : Promise.resolve({ data: [] }),
    studentIds.length > 0
      ? supabase
          .from('authorized_pickups')
          .select('id, student_id, first_name, middle_name, last_name, relationship, phone_number, photo_path')
          .in('student_id', studentIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  // Rows themselves were just fetched under parents_manage_own_students_pickups
  // RLS (proof of ownership), so minting signed URLs for their photos via the
  // admin client here is safe — same "fetch under RLS first, mint URL after"
  // shape as getOwnDocumentSignedUrl, just inlined since this is a page
  // render, not a client-triggered action.
  const adminClient = createAdminClient()
  const pickupsWithUrls = await Promise.all(
    (pickups ?? []).map(async (p) => {
      const idCode = pickupIdCode(p.id)
      const idLabel = pickupIdLabel(p.id)
      if (!p.photo_path) return { ...p, photoUrl: null, idCode, idLabel }
      const { data: signed } = await adminClient.storage.from('pickup-photos').createSignedUrl(p.photo_path, PICKUP_PHOTO_URL_TTL_SECONDS)
      return { ...p, photoUrl: signed?.signedUrl ?? null, idCode, idLabel }
    })
  )

  return (
    <div className="space-y-6">
      <Header tab={tab} />

      {(students ?? []).length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Enrolled Students Yet"
          description="Once a child is enrolled, you can register the people authorized to pick them up here."
          action={{ href: '/parent/enroll-a-student', label: 'Enroll A Student' }}
        />
      ) : (
        <AuthorizedPickupManager students={students ?? []} pickups={pickupsWithUrls} />
      )}
    </div>
  )
}
