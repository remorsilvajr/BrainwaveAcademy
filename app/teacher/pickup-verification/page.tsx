import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PickupVerificationPanel } from '@/components/teacher/pickup-verification-panel'
import { EmptyState } from '@/components/ui/empty-state'

export default async function TeacherPickupVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()

  const [{ data: students }, { data: classrooms }] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name, classroom_id').order('first_name', { ascending: true }),
    supabase.from('classrooms').select('id, name').order('created_at', { ascending: true }),
  ])

  const selectedId = studentParam ?? students?.[0]?.id ?? null

  if (!selectedId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Pickup Verification</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Look up a child&apos;s authorized pickup list and confirm who&apos;s allowed to collect them.
          </p>
        </div>
        <EmptyState icon={Users} title="No Students on File Yet" description="Once students are enrolled, you can look up their authorized pickup list here." />
      </div>
    )
  }

  const selectedStudent = (students ?? []).find((s) => s.id === selectedId)
  const studentName = selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'this student'

  const { data: pickups } = await supabase
    .from('authorized_pickups')
    .select('id, full_name, relationship, phone_number, photo_path')
    .eq('student_id', selectedId)
    .order('created_at', { ascending: true })

  // staff_view_all_pickups RLS already scoped this read to teacher/admin —
  // minting signed URLs for the photos via the admin client is just the
  // trusted mechanism for a private bucket, not an extra permission check.
  const adminClient = createAdminClient()
  const pickupsWithUrls = await Promise.all(
    (pickups ?? []).map(async (p) => {
      if (!p.photo_path) return { ...p, photoUrl: null }
      const { data: signed } = await adminClient.storage.from('pickup-photos').createSignedUrl(p.photo_path, 60 * 5)
      return { ...p, photoUrl: signed?.signedUrl ?? null }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Pickup Verification</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Look up a child&apos;s authorized pickup list and confirm who&apos;s allowed to collect them.
        </p>
      </div>

      <PickupVerificationPanel
        students={students ?? []}
        classrooms={classrooms ?? []}
        selectedId={selectedId}
        studentName={studentName}
        pickups={pickupsWithUrls}
        basePath="/teacher/pickup-verification"
      />
    </div>
  )
}
