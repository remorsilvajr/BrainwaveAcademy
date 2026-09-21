import { createClient } from '@/lib/supabase/server'
import { healthInputFrom, type EmergencyContact, type StudentHealth } from '@/lib/health'
import { StudentsTable } from '@/components/admin/students-table'
import { summarizeOutstanding, type UnpaidFee } from '@/lib/payments'

type ParentLink = {
  relationship: string | null
  profiles: { first_name: string; last_name: string; phone_number: string | null; email: string } | null
}

type StudentRow = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
  application_id: string | null
  classroom_id: string | null
  program_options: string[]
  parent_student: ParentLink[] | null
}

export default async function StudentsPage() {
  const supabase = await createClient()

  const [{ data: students }, { data: documents }, { data: classrooms }, { data: pendingFees }, { data: healthRows }, { data: contactRows }] = await Promise.all([
    supabase
      .from('students')
      .select('*, parent_student(relationship, profiles(first_name, last_name, phone_number, email))')
      .order('created_at', { ascending: false }),
    supabase.from('application_documents').select('*'),
    supabase
      .from('classrooms')
      .select('id, name, slug, min_age_months, max_age_months')
      .order('created_at', { ascending: true }),
    // Every unpaid fee school-wide (uncapped: it feeds per-child sums), grouped
    // by child below. Same "pending = outstanding" rule as the dashboard.
    supabase
      .from('payments')
      .select('id, student_id, fee_type, description, amount, due_date, status')
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('student_health').select('*'),
    supabase.from('emergency_contacts').select('student_id, position, full_name, relationship, phone_number'),
  ])

  const docs = documents ?? []
  const classroomById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const feesByStudentId = new Map<string, NonNullable<typeof pendingFees>>()
  for (const fee of pendingFees ?? []) {
    feesByStudentId.set(fee.student_id, [...(feesByStudentId.get(fee.student_id) ?? []), fee])
  }

  const rows = ((students ?? []) as StudentRow[]).map((s) => {
    const fees = feesByStudentId.get(s.id) ?? []
    const summary = summarizeOutstanding(fees)
    const unpaidFees: UnpaidFee[] = fees.map(({ id, fee_type, description, amount, due_date }) => ({
      id,
      fee_type,
      description,
      amount,
      due_date,
    }))
    return {
    ...s,
    health: healthInputFrom(
      ((healthRows ?? []).find((h) => h.student_id === s.id) as StudentHealth | undefined) ?? null,
      (contactRows ?? []).filter((c) => c.student_id === s.id) as EmergencyContact[]
    ),
    outstanding: summary.outstanding,
    overdue: summary.overdue,
    unpaidFees,
    classroomName: s.classroom_id ? (classroomById.get(s.classroom_id) ?? null) : null,
    guardians: (s.parent_student ?? []).map((ps) => ({
      name: `${ps.profiles?.first_name ?? ''} ${ps.profiles?.last_name ?? ''}`.trim(),
      relationship: ps.relationship,
      phone: ps.profiles?.phone_number ?? null,
      email: ps.profiles?.email ?? null,
    })),
    documents: docs.filter((d) => d.application_id === s.application_id),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Directory</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search, inspect, and reference official student records and guardian contact profiles.
        </p>
      </div>
      <StudentsTable students={rows} classrooms={classrooms ?? []} />
    </div>
  )
}
