import { createClient } from '@/lib/supabase/server'
import { EnrollStudentForm } from '@/components/parent/enroll-student-form'

export default async function EnrollAStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const { submitted } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user?.id ?? '')
    .single()

  const parentName = profile ? `${profile.first_name} ${profile.last_name}` : 'your account'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enroll A Student</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Register a sibling or additional learner under your existing parent account.
        </p>
      </div>

      {submitted === 'true' ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 p-8 text-center">
          <p className="text-lg font-semibold text-green-800">Application submitted!</p>
          <p className="mt-1 text-sm text-green-700">
            Our admissions team will review it and notify you once it&apos;s approved.
          </p>
        </div>
      ) : (
        <EnrollStudentForm parentName={parentName} />
      )}
    </div>
  )
}
