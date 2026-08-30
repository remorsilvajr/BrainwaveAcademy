import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { documentOrder } from '@/lib/documents'

export default async function ParentDashboardPage({
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
  const [{ data: profile }, { data: applications }] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', user?.id ?? '').single(),
    supabase
      .from('applications')
      .select('id, status, student_first_name, student_last_name, created_student_id')
      .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
      .order('submitted_at', { ascending: true }),
  ])

  const selectedApplication =
    (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  const { data: documents } = selectedApplication
    ? await supabase
        .from('application_documents')
        .select('verification_status')
        .eq('application_id', selectedApplication.id)
    : { data: [] }

  const validCount = (documents ?? []).filter((d) => d.verification_status === 'valid').length
  const needsCorrection = (documents ?? []).some((d) => d.verification_status === 'needs_correction')
  const progressPercent = Math.round((validCount / documentOrder.length) * 100)

  const progressLabel = selectedApplication?.created_student_id
    ? 'Enrolled'
    : needsCorrection
      ? 'Needs Correction'
      : selectedApplication?.status !== 'approved'
        ? 'Pending Review'
        : 'Under Review'

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#0b1b62]">
        Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Enrollment Progress</h2>
            {selectedApplication && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  progressLabel === 'Enrolled'
                    ? 'bg-green-50 text-green-700'
                    : progressLabel === 'Needs Correction'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {progressLabel}
              </span>
            )}
          </div>

          {selectedApplication ? (
            <>
              <p className="mt-4 text-sm text-gray-600">
                {validCount} of {documentOrder.length} Requirements Completed
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <Link
                href="/parent/requirements"
                className="mt-4 inline-block text-sm font-semibold text-[#00a3e0] hover:underline"
              >
                View Requirements →
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No enrollment application on file yet.{' '}
              <Link href="/parent/enroll-a-student" className="font-semibold text-[#00a3e0] hover:underline">
                Enroll a student
              </Link>{' '}
              to get started.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Due Balance</h2>
          <p className="mt-4 text-3xl font-bold text-[#0b1b62]">₱0.00</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <CalendarClock className="h-4 w-4" />
            No payments due at this time.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements &amp; School Updates</h2>
        </div>
        <p className="mt-4 text-sm text-gray-500">No announcements yet.</p>
      </div>
    </div>
  )
}
