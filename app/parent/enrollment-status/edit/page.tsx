import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CorrectApplicationForm } from '@/components/parent/correct-application-form'

// Where a parent fixes a request the school asked them to correct. Only reachable
// for their own request while it is waiting for that correction; anything else goes
// back to Enrollment Status (the database refuses the write anyway).
export default async function EditEnrollmentRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!student || !user) redirect('/parent/enrollment-status')

  const [{ data: application }, { data: classrooms }] = await Promise.all([
    supabase
      .from('applications')
      .select(
        'id, status, student_first_name, student_middle_name, student_last_name, student_dob, student_gender, parent_first_name, parent_middle_name, parent_last_name, parent_dob, parent_relationship, parent_gender, parent_contact_number, parent_email, requested_classroom_id, requested_program_options, review_notes'
      )
      .eq('id', student)
      .eq('created_parent_id', user.id)
      .maybeSingle(),
    supabase.from('classrooms').select('id, name, slug, min_age_months, max_age_months, tuition_fee, activity_fee').order('created_at'),
  ])

  if (!application) redirect('/parent/enrollment-status')
  if (application.status !== 'needs_correction') redirect(`/parent/enrollment-status?student=${application.id}`)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Update Your Enrollment Request</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fix what the school asked about, then resubmit. It goes straight back to the school for review.
        </p>
      </div>
      <CorrectApplicationForm application={application} classrooms={classrooms ?? []} />
    </div>
  )
}
