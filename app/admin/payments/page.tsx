import { createClient } from '@/lib/supabase/server'
import { PaymentsTable } from '@/components/admin/payments-table'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  const [{ data: payments }, { data: students }] = await Promise.all([
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id, classroom_id')
      .order('first_name', { ascending: true }),
  ])

  const studentById = new Map((students ?? []).map((s) => [s.id, s]))

  const rows = (payments ?? []).map((p) => {
    const student = studentById.get(p.student_id)
    return {
      ...p,
      studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown student',
      studentAccountId: student?.student_id ?? null,
    }
  })

  const studentOptions = (students ?? []).map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name}`,
    sublabel: s.student_id ?? undefined,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Record cash/check payments and review every fee item and payment across the school.
        </p>
      </div>
      <PaymentsTable payments={rows} studentOptions={studentOptions} />
    </div>
  )
}
