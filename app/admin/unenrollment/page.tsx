import { roundToCents } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { UnenrollmentTable, type UnenrollmentAdminRow } from '@/components/admin/unenrollment-table'
import { UnenrollStudentForm, type UnenrollCandidate } from '@/components/admin/unenroll-student-form'
import { AttendanceTabLinks } from '@/components/attendance/attendance-tab-links'
import { TERMINAL_STATUS_FILTER } from '@/lib/student-status'

const TABS = [
  { key: 'requests', label: 'Unenrollment Requests' },
  { key: 'unenroll', label: 'Unenroll a Student' },
]

function Header({ tab }: { tab: string }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Unenrollment</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review parents&apos; requests to withdraw a child, or unenroll a student directly. Either way the child leaves rosters
          and attendance, you decide what happens to any unpaid fees, and the parent is told.
        </p>
      </div>
      <AttendanceTabLinks basePath="/admin/unenrollment" active={tab} tabs={TABS} />
    </>
  )
}

export default async function AdminUnenrollmentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'unenroll' ? 'unenroll' : 'requests'
  const supabase = await createClient()

  if (tab === 'unenroll') {
    const [{ data: students }, { data: classrooms }, { data: pending }, { data: unpaid }] = await Promise.all([
      supabase
        .from('students')
        .select('id, first_name, last_name, student_id, classroom_id')
        .not('enrollment_status', 'in', TERMINAL_STATUS_FILTER)
        .order('first_name', { ascending: true }),
      supabase.from('classrooms').select('id, name'),
      supabase.from('unenrollment_requests').select('student_id').eq('status', 'pending'),
      supabase.from('payments').select('id, student_id, description, fee_type, amount, amount_paid, due_date').eq('status', 'pending'),
    ])
    const classroomNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
    const pendingIds = new Set((pending ?? []).map((p) => p.student_id))
    const candidates: UnenrollCandidate[] = (students ?? []).map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      studentAccountId: s.student_id ?? null,
      programName: s.classroom_id ? (classroomNameById.get(s.classroom_id) ?? null) : null,
      hasPendingRequest: pendingIds.has(s.id),
      unpaidFees: (unpaid ?? [])
        .filter((f) => f.student_id === s.id)
        .map((f) => ({ id: f.id, description: f.description ?? f.fee_type, amount: roundToCents(f.amount - f.amount_paid), due_date: f.due_date })),
    }))
    return (
      <div className="space-y-6">
        <Header tab={tab} />
        <UnenrollStudentForm students={candidates} />
      </div>
    )
  }

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
          .select('id, student_id, description, fee_type, amount, amount_paid, due_date')
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
        .map((f) => ({ id: f.id, description: f.description ?? f.fee_type, amount: roundToCents(f.amount - f.amount_paid), due_date: f.due_date })),
    }
  })

  return (
    <div className="space-y-6">
      <Header tab={tab} />
      <UnenrollmentTable requests={items} />
    </div>
  )
}
