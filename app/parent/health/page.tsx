import { ClipboardList, GraduationCap, HeartPulse } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parentApplicationsFilter } from '@/lib/parent-applications'
import { withStudent } from '@/lib/parent-links'
import { EmptyState } from '@/components/ui/empty-state'
import { HealthForm } from '@/components/health/health-form'
import { healthInputFrom, type EmergencyContact, type StudentHealth } from '@/lib/health'
import { isTerminalStudentStatus } from '@/lib/student-status'

const intro =
  "Tell the school about allergies, medical conditions and who to call in an emergency. Your child's teachers and the school office can see this, and no other family can. Please keep it up to date."

function Header({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">{title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{intro}</p>
    </div>
  )
}

// Follows the top bar's selected child (`?student=`, an application id) like
// every other per-child page; it used to list only enrolled children, so
// picking an applicant in the switcher left the enrolled child on screen.
export default async function ParentHealthPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: applications } = await supabase
    .from('applications')
    .select('id, student_first_name, student_last_name, created_student_id')
    .eq('hidden_from_parent', false)
    .or(parentApplicationsFilter(user))
    .order('submitted_at', { ascending: true })

  const application = (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  if (!application) {
    return (
      <div className="space-y-6">
        <Header title="Health & Emergency" />
        <EmptyState
          icon={ClipboardList}
          title="No Enrollment Application Yet"
          description="Once a child is enrolled, you can add their health and emergency information here."
          action={{ href: '/parent/enroll-a-student', label: 'Enroll A Student' }}
        />
      </div>
    )
  }

  const studentName = `${application.student_first_name} ${application.student_last_name}`
  const title = `Health & Emergency for ${studentName}`

  if (!application.created_student_id) {
    return (
      <div className="space-y-6">
        <Header title={title} />
        <EmptyState
          icon={GraduationCap}
          title="Not Enrolled Yet"
          tone="warning"
          description={`${studentName} hasn't been enrolled yet. You can add their health and emergency information once they are. Check Enrollment Status for the latest update.`}
          action={{ href: withStudent('/parent/enrollment-status', studentParam), label: 'View Enrollment Status' }}
        />
      </div>
    )
  }

  const studentId = application.created_student_id
  const [{ data: student }, { data: health }, { data: contactRows }] = await Promise.all([
    supabase.from('students').select('id, enrollment_status').eq('id', studentId).maybeSingle(),
    supabase.from('student_health').select('*').eq('student_id', studentId).maybeSingle(),
    supabase.from('emergency_contacts').select('student_id, position, full_name, relationship, phone_number').eq('student_id', studentId),
  ])

  if (!student || isTerminalStudentStatus(student.enrollment_status)) {
    return (
      <div className="space-y-6">
        <Header title={title} />
        <EmptyState
          icon={HeartPulse}
          title="No Longer Enrolled"
          description={`${studentName} is no longer enrolled, so their health and emergency information can't be changed here.`}
        />
      </div>
    )
  }

  const contacts = (contactRows ?? []) as (EmergencyContact & { student_id: string })[]
  const started = !!health || contacts.length > 0

  return (
    <div className="space-y-6">
      <Header title={title} />
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              started
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            }`}
          >
            {started ? 'Information on file' : 'Not filled in yet'}
          </span>
        </div>
        <HealthForm key={studentId} studentId={studentId} initial={healthInputFrom((health as StudentHealth | null) ?? null, contacts)} />
      </section>
    </div>
  )
}
