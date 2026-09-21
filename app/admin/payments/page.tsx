import { createClient } from '@/lib/supabase/server'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { roundToCents } from '@/lib/format'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  const [
    { data: payments },
    { data: students },
    { data: walletRequests },
    { data: parents },
    { data: wallets },
    { data: parentStudentLinks },
    { data: walletTransactions },
  ] =
    await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase
        .from('students')
        .select('id, first_name, last_name, student_id, classroom_id')
        .order('first_name', { ascending: true }),
      supabase.from('wallet_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'parent').order('first_name', { ascending: true }),
      supabase.from('wallets').select('parent_id, balance'),
      supabase.from('parent_student').select('parent_id, student_id'),
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
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

  const parentById = new Map((parents ?? []).map((p) => [p.id, p]))
  const walletRequestRows = (walletRequests ?? []).map((r) => {
    const parent = parentById.get(r.parent_id)
    return {
      ...r,
      parentName: parent ? `${parent.first_name} ${parent.last_name}` : 'Unknown parent',
      parentEmail: parent?.email ?? null,
    }
  })

  const walletTransactionRows = (walletTransactions ?? []).map((t) => {
    const parent = parentById.get(t.parent_id)
    return {
      id: t.id,
      parentName: parent ? `${parent.first_name} ${parent.last_name}` : 'Unknown parent',
      parentEmail: parent?.email ?? null,
      amount: t.amount,
      balance_after: t.balance_after,
      note: t.note,
      created_at: t.created_at,
    }
  })

  const balanceByParentId = new Map((wallets ?? []).map((w) => [w.parent_id, w.balance]))
  // A parent's outstanding balance is every pending fee across their linked
  // children, the same sum the parent's own dashboard shows as Due Balance.
  const pendingByStudentId = new Map<string, number>()
  for (const p of payments ?? []) {
    if (p.status === 'pending') pendingByStudentId.set(p.student_id, (pendingByStudentId.get(p.student_id) ?? 0) + p.amount)
  }
  const outstandingByParentId = new Map<string, number>()
  for (const link of parentStudentLinks ?? []) {
    outstandingByParentId.set(
      link.parent_id,
      (outstandingByParentId.get(link.parent_id) ?? 0) + (pendingByStudentId.get(link.student_id) ?? 0)
    )
  }
  const parentWalletRows = (parents ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
    balance: balanceByParentId.get(p.id) ?? 0,
    outstanding: roundToCents(outstandingByParentId.get(p.id) ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Record cash payments, review every fee item and payment, and manage parent wallets.
        </p>
      </div>
      <PaymentsTabs payments={rows} walletTransactions={walletTransactionRows} studentOptions={studentOptions} parents={parentWalletRows} requests={walletRequestRows} />
    </div>
  )
}
