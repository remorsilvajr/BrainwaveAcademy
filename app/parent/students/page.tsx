import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { calculateAge, formatDateLong } from '@/lib/format'
import { documentOrder, documentShortLabels } from '@/lib/documents'
import { StudentAvatarEditor } from '@/components/parent/student-avatar-editor'

export default async function StudentProfilePage({
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
  const [{ data: applications }, { data: parentProfile }] = await Promise.all([
    supabase
      .from('applications')
      .select('*')
      .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
      .order('submitted_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('first_name, last_name, relationship_to_student, phone_number, email')
      .eq('id', user?.id ?? '')
      .single(),
  ])

  const application = (applications ?? []).find((a) => a.id === studentParam) ?? applications?.[0] ?? null

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enrollment Profile</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View your child&apos;s enrollment record.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No applicants or students on file yet.{' '}
          <Link href="/parent/enroll-a-student" className="font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            Enroll a student
          </Link>{' '}
          to get started.
        </div>
      </div>
    )
  }

  const [{ data: documents }, { data: student }] = await Promise.all([
    supabase
      .from('application_documents')
      .select('document_type, verification_status')
      .eq('application_id', application.id),
    application.created_student_id
      ? supabase.from('students').select('avatar_url').eq('id', application.created_student_id).single()
      : Promise.resolve({ data: null }),
  ])

  const validCount = (documents ?? []).filter((d) => d.verification_status === 'valid').length
  const fullName = `${application.student_first_name}${application.student_middle_name ? ' ' + application.student_middle_name : ''} ${application.student_last_name}`

  const statusLabel = application.created_student_id
    ? 'Enrolled'
    : (documents ?? []).some((d) => d.verification_status === 'needs_correction')
      ? 'Needs Correction'
      : application.status === 'rejected'
        ? 'Rejected'
        : application.status !== 'approved'
          ? 'Pending Review'
          : 'Under Review'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">
          {application.created_student_id ? 'Student Profile' : 'Applicant Profile'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View your child&apos;s enrollment record.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
          {application.created_student_id ? (
            <StudentAvatarEditor studentId={application.created_student_id} avatarUrl={student?.avatar_url ?? null} />
          ) : (
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              <GraduationCap className="h-9 w-9" />
            </span>
          )}
          <p className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">{fullName}</p>
          <span
            className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
              statusLabel === 'Enrolled'
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700'
                : statusLabel === 'Needs Correction' || statusLabel === 'Rejected'
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
            }`}
          >
            {statusLabel}
          </span>

          <div className="mt-6 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Application Ref</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{application.application_ref}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Submitted</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDateLong(application.submitted_at)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 md:col-span-2">
          <h2 className="border-b border-gray-100 dark:border-gray-800 pb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Personal Details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">Date of Birth (Age)</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDateLong(application.student_dob)} ({calculateAge(application.student_dob)}y)
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">Gender</p>
              <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">{application.student_gender}</p>
            </div>
          </div>

          <h2 className="mt-6 border-b border-gray-100 dark:border-gray-800 pb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Guardian Info
          </h2>
          <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {parentProfile?.first_name} {parentProfile?.last_name}{' '}
              {parentProfile?.relationship_to_student && (
                <span className="text-xs text-gray-500 dark:text-gray-400">({parentProfile.relationship_to_student})</span>
              )}
            </p>
            {parentProfile?.email && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{parentProfile.email}</p>}
            {parentProfile?.phone_number && <p className="text-sm text-gray-600 dark:text-gray-400">{parentProfile.phone_number}</p>}
          </div>

          <h2 className="mt-6 border-b border-gray-100 dark:border-gray-800 pb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Requirements
          </h2>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {validCount} of {documentOrder.length} documents verified
          </p>
          <div className="mt-3 space-y-2">
            {documentOrder.map((type) => {
              const doc = (documents ?? []).find((d) => d.document_type === type)
              const status = doc?.verification_status ?? 'not_submitted'
              return (
                <div key={type} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{documentShortLabels[type]}</span>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      status === 'valid'
                        ? 'text-green-600 dark:text-green-400'
                        : status === 'needs_correction'
                          ? 'text-red-600 dark:text-red-400'
                          : status === 'pending'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
          <Link
            href="/parent/requirements"
            className="mt-4 inline-block text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
          >
            Manage Requirements →
          </Link>
        </div>
      </div>
    </div>
  )
}
