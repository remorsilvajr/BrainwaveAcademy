import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DeletedAccountsTable } from '@/components/admin/deleted-accounts-table'
import { DeletedApplicationsTable } from '@/components/admin/deleted-applications-table'
import { DeletedFeesTable } from '@/components/admin/deleted-fees-table'
import { createAdminClient } from '@/lib/supabase/admin'

// Super-admin-only, both to view and to restore — a regular admin can
// still delete an account or enrollment request (subject to
// canModerateAccount for accounts), but only a super admin can see where
// it went or bring it back. Not gated in middleware.ts (that only does
// broad role-based routing for /admin, /teacher, /parent) — checked here
// instead, same as any other super-admin-only surface would be.
export default async function DeletedItemsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!currentProfile?.is_super_admin) {
    redirect('/admin')
  }

  // Full column sets, not just what the list rows themselves display — the
  // "View Full Details" modal reuses the exact same UserEditModal /
  // EnrollmentRequestModal an active record's own row opens (in their
  // readOnly mode), so it needs everything those already fetch, including
  // a deleted parent's own linked-students/applicants relations. Same
  // shape as app/admin/user-management/page.tsx's own query, duplicated
  // rather than shared — this is the only other call site that needs it.
  const [{ data: deletedAccounts }, { data: deletedApplications }, { data: pendingApplications }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, first_name, middle_name, last_name, email, role, phone_number, date_of_birth, relationship_to_student, gender, avatar_url, deleted_at, parent_student(relationship, students(id, first_name, middle_name, last_name))'
      )
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('applications')
      .select(
        'id, application_ref, status, created_parent_id, reviewed_at, student_first_name, student_middle_name, student_last_name, student_dob, student_gender, parent_first_name, parent_middle_name, parent_last_name, parent_dob, parent_relationship, parent_gender, parent_contact_number, parent_email, review_notes, deleted_at'
      )
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('applications')
      .select('id, created_parent_id, student_first_name, student_middle_name, student_last_name')
      .not('created_parent_id', 'is', null)
      .is('created_student_id', null),
  ])

  const applicantsByParentId = new Map<string, typeof pendingApplications>()
  for (const application of pendingApplications ?? []) {
    if (!application.created_parent_id) continue
    const existing = applicantsByParentId.get(application.created_parent_id) ?? []
    applicantsByParentId.set(application.created_parent_id, [...existing, application])
  }

  // Deleted fees live in deleted_payments, which has no policies at all: read
  // with the service role, only after the super-admin check above.
  const { data: deletedFeeRows } = await createAdminClient()
    .from('deleted_payments')
    .select('id, student_id, description, fee_type, amount, payment, reason, deleted_by, deleted_at')
    .order('deleted_at', { ascending: false })
  const feeStudentIds = [...new Set((deletedFeeRows ?? []).map((f) => f.student_id))]
  const feeActorIds = [...new Set((deletedFeeRows ?? []).map((f) => f.deleted_by).filter(Boolean))]
  const [{ data: feeStudents }, { data: feeActors }] = await Promise.all([
    feeStudentIds.length > 0 ? supabase.from('students').select('id, first_name, last_name, student_id').in('id', feeStudentIds) : Promise.resolve({ data: [] }),
    feeActorIds.length > 0 ? supabase.from('profiles').select('id, first_name, last_name').in('id', feeActorIds) : Promise.resolve({ data: [] }),
  ])
  const feeStudentById = new Map((feeStudents ?? []).map((s) => [s.id, s]))
  const feeActorById = new Map((feeActors ?? []).map((a) => [a.id, `${a.first_name} ${a.last_name}`]))
  const deletedFees = (deletedFeeRows ?? []).map((f) => {
    const student = feeStudentById.get(f.student_id)
    const payment = f.payment as { status?: string; due_date?: string | null }
    return {
      id: f.id,
      studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
      studentAccountId: student?.student_id ?? null,
      label: f.description || `${f.fee_type.charAt(0).toUpperCase()}${f.fee_type.slice(1)} fee`,
      amount: Number(f.amount),
      status: payment.status ?? 'pending',
      dueDate: payment.due_date ?? null,
      reason: f.reason,
      deletedAt: f.deleted_at,
      deletedByName: f.deleted_by ? (feeActorById.get(f.deleted_by) ?? 'Unknown') : 'Unknown',
    }
  })

  const accountsWithApplicants = (deletedAccounts ?? []).map((a) => ({
    ...a,
    // Supabase infers `students` as an array here (no generated DB types to
    // tell it the FK is one-to-one) — normalize to the single-object shape
    // UserEditModal actually expects, same as user-management/page.tsx gets
    // for free by querying with `select('*, ...)` instead of an explicit
    // column list.
    parent_student: (a.parent_student ?? []).map((ps) => ({
      relationship: ps.relationship,
      students: Array.isArray(ps.students) ? (ps.students[0] ?? null) : ps.students,
    })),
    applicants: applicantsByParentId.get(a.id) ?? [],
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Deleted Items</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nothing here is erased from the database. Deleting an account, enrollment request or fee just
          hides it everywhere else. Select items below and restore them whenever you need to.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deleted Accounts</h2>
        <DeletedAccountsTable accounts={accountsWithApplicants} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deleted Enrollment Requests</h2>
        <DeletedApplicationsTable applications={deletedApplications ?? []} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Deleted Fees</h2>
        <DeletedFeesTable fees={deletedFees} />
      </div>
    </div>
  )
}
