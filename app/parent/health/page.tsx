import { HeartPulse } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { HealthForm } from '@/components/health/health-form'
import { healthInputFrom, type EmergencyContact, type StudentHealth } from '@/lib/health'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'

export default async function ParentHealthPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: links } = await supabase.from('parent_student').select('student_id').eq('parent_id', user?.id ?? '')
  const studentIds = (links ?? []).map((l) => l.student_id)

  const [{ data: students }, { data: healthRows }, { data: contactRows }] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', studentIds)
          .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
          .order('first_name', { ascending: true })
      : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from('student_health').select('*').in('student_id', studentIds) : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from('emergency_contacts').select('student_id, position, full_name, relationship, phone_number').in('student_id', studentIds) : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Health &amp; Emergency</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tell the school about allergies, medical conditions and who to call in an emergency. Your child&apos;s teachers and
          the school office can see this, and no other family can. Please keep it up to date.
        </p>
      </div>

      {(students ?? []).length === 0 ? (
        <EmptyState icon={HeartPulse} title="No Enrolled Students" description="Once a child is enrolled, you can add their health and emergency information here." />
      ) : (
        (students ?? []).map((s) => {
          const health = (healthRows ?? []).find((h) => h.student_id === s.id) as (StudentHealth & { student_id: string }) | undefined
          const contacts = (contactRows ?? []).filter((c) => c.student_id === s.id) as (EmergencyContact & { student_id: string })[]
          const started = !!health || contacts.length > 0
          return (
            <section key={s.id} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {s.first_name} {s.last_name}
                </h2>
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
              <HealthForm studentId={s.id} initial={healthInputFrom(health ?? null, contacts)} />
            </section>
          )
        })
      )}
    </div>
  )
}
