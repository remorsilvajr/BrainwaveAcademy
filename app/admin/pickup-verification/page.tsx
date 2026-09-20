import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PickupVerificationPanel } from '@/components/teacher/pickup-verification-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { ALL_STUDENTS } from '@/lib/pickup-constants'
import { loadPickupsWithPhotos } from '@/lib/pickup-list'

export default async function AdminPickupVerificationPage({
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

  const showAll = selectedId === ALL_STUDENTS
  const selectedStudent = (students ?? []).find((s) => s.id === selectedId)
  const studentName = selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'this student'

  const pickups = await loadPickupsWithPhotos(supabase, selectedId)

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
        studentName={showAll ? 'All Students' : studentName}
        pickups={pickups}
        basePath="/admin/pickup-verification"
      />
    </div>
  )
}
