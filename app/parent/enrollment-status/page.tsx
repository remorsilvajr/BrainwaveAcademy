import Link from 'next/link'
import { CheckCircle2, Circle, FileWarning, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDateLong } from '@/lib/format'
import { EmptyState } from '@/components/ui/empty-state'

type Stage = 'submitted' | 'approved' | 'documents' | 'enrolled' | 'rejected'

function stageOf(app: { status: string; created_student_id: string | null }, hasCorrections: boolean, hasDocs: boolean): Stage {
  if (app.status === 'rejected') return 'rejected'
  if (app.created_student_id) return 'enrolled'
  if (app.status !== 'approved') return 'submitted'
  if (hasCorrections || hasDocs) return 'documents'
  return 'approved'
}

const steps: { key: Stage; label: string }[] = [
  { key: 'submitted', label: 'Application Submitted' },
  { key: 'approved', label: 'Approved for Enrollment' },
  { key: 'documents', label: 'Documents Under Review' },
  { key: 'enrolled', label: 'Enrolled' },
]

function stepStatus(stepIndex: number, currentStage: Stage) {
  if (currentStage === 'rejected') return stepIndex === 0 ? 'done' : 'skipped'
  const order: Stage[] = ['submitted', 'approved', 'documents', 'enrolled']
  const currentIndex = order.indexOf(currentStage)
  if (stepIndex < currentIndex) return 'done'
  // "Enrolled" is a terminal state, not an in-progress one — being the
  // current stage there means the whole pipeline is complete, not that
  // something is still happening.
  if (stepIndex === currentIndex) return currentStage === 'enrolled' ? 'done' : 'current'
  return 'upcoming'
}

export default async function EnrollmentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // See app/parent/layout.tsx for why this matches on parent_email too, not
  // just created_parent_id.
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
    .order('submitted_at', { ascending: true })

  const application = (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enrollment Status</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track your child&apos;s enrollment progress.</p>
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No Enrollment Application Yet"
          description="Once you've started an application for your child, its progress through submission, approval, document review, and enrollment will be tracked here step by step."
          action={{ href: '/parent/enroll-a-student', label: 'Enroll A Student' }}
        />
      </div>
    )
  }

  const { data: documents } = await supabase
    .from('application_documents')
    .select('verification_status')
    .eq('application_id', application.id)

  const hasCorrections = (documents ?? []).some((d) => d.verification_status === 'needs_correction')
  const hasDocs = (documents ?? []).length > 0 && (documents ?? []).some((d) => d.verification_status !== 'valid')
  const stage = stageOf(application, hasCorrections, hasDocs)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enrollment Status</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track your child&apos;s enrollment progress.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {application.student_first_name} {application.student_last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {application.application_ref} • Submitted {formatDateLong(application.submitted_at)}
            </p>
          </div>
        </div>

        {stage === 'rejected' ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800">This application was not approved.</p>
              {application.review_notes && (
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{application.review_notes}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {steps.map((step, i) => {
              const status = stepStatus(i, stage)
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : status === 'current' ? (
                    <Circle className="h-5 w-5 shrink-0 fill-amber-100 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                  )}
                  <p
                    className={`text-sm ${
                      status === 'upcoming' ? 'text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {step.label}
                  </p>
                  {status === 'current' && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      In Progress
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {stage === 'documents' && (
          <Link
            href="/parent/requirements"
            className="mt-6 inline-block text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
          >
            Go to Requirements →
          </Link>
        )}
      </div>
    </div>
  )
}
