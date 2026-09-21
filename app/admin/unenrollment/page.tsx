import { createClient } from '@/lib/supabase/server'
import { UnenrollmentTable, type UnenrollmentAdminRow } from '@/components/admin/unenrollment-table'

export default async function AdminUnenrollmentPage() {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from('unenrollment_requests')
    .select('id, student_id, requested_by, reason, last_day, status, review_note, fee_decision, reviewed_at, created_at')
    .order('created_at', { ascending: false })

  const rows = requests ?? []
  const studentIds = [...new Set(rows.map((r) => r.student_id))]
  const parentIds = [...new Set(rows.map((r) => r.requested_by))]

  const [{ data: students }, { data: parents }, { data: classrooms }, { data: unpaid }] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('students').select('id, first_name, last_name, student_id, enrollment_status, classroom_id').in('id', studentIds)
      : Promise.resolve({ data: [] }),
    parentIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, email, phone_number').in('id', parentIds)
      : Promise.resolve({ data: [] }),
    supabase.from('classrooms').select('id, name'),
    // Unpaid fees of the children involved: what the approval decision is about.
    studentIds.length > 0
      ? supabase
          .from('payments')
          .select('id, student_id, description, fee_type, amount, due_date')
          .in('student_id', studentIds)
          .eq('status', 'pending')
      : Promise.resolve({ data: [] }),
  ])

  const studentById = new Map((students ?? []).map((s) => [s.id, s]))
  const parentById = new Map((parents ?? []).map((p) => [p.id, p]))
  const classroomNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const items: UnenrollmentAdminRow[] = rows.map((r) => {
    const s = studentById.get(r.student_id)
    const p = parentById.get(r.requested_by)
    return {
      id: r.id,
      reason: r.reason,
      last_day: r.last_day,
      status: r.status,
      review_note: r.review_note,
      fee_decision: r.fee_decision,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
      studentName: s ? `${s.first_name} ${s.last_name}` : 'Unknown student',
      studentAccountId: s?.student_id ?? null,
      studentStatus: s?.enrollment_status ?? 'unknown',
      programName: s?.classroom_id ? (classroomNameById.get(s.classroom_id) ?? null) : null,
      parentName: p ? `${p.first_name} ${p.last_name}` : 'Unknown parent',
      parentEmail: p?.email ?? null,
      parentPhone: p?.phone_number ?? null,
      unpaidFees: (unpaid ?? [])
        .filter((f) => f.student_id === r.student_id)
        .map((f) => ({ id: f.id, description: f.description ?? f.fee_type, amount: f.amount, due_date: f.due_date })),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Unenrollment Requests</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Parents ask to withdraw a child from here. Approving withdraws the child, takes them off rosters and attendance,
          and lets you decide what happens to any unpaid fees. The parent is emailed either way.
        </p>
      </div>
      <UnenrollmentTable requests={items} />
    </div>
  )
}
