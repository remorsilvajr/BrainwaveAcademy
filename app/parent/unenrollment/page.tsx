import { UserMinus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { UnenrollmentManager } from '@/components/parent/unenrollment-manager'

export default async function ParentUnenrollmentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: links } = await supabase.from('parent_student').select('student_id').eq('parent_id', user?.id ?? '')
  const studentIds = (links ?? []).map((l) => l.student_id)

  const [{ data: students }, { data: classrooms }, { data: requests }] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from('students')
          .select('id, first_name, last_name, enrollment_status, classroom_id')
          .in('id', studentIds)
          .order('first_name', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from('classrooms').select('id, name'),
    studentIds.length > 0
      ? supabase
          .from('unenrollment_requests')
          .select('id, student_id, reason, last_day, status, review_note, created_at')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const classroomNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const childRows = (students ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    status: s.enrollment_status,
    programName: s.classroom_id ? (classroomNameById.get(s.classroom_id) ?? null) : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Unenroll A Student</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Need to withdraw your child from the school? Send a request here. The school reviews it and emails you the
          decision. Your child stays enrolled until it&apos;s approved.
        </p>
      </div>

      {childRows.length === 0 ? (
        <EmptyState
          icon={UserMinus}
          title="No Enrolled Students"
          description="Once a child is enrolled, you can request their unenrollment here."
        />
      ) : (
        <UnenrollmentManager students={childRows} requests={requests ?? []} />
      )}
    </div>
  )
}
