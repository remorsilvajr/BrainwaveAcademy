import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// The cashier role: the cash desk in Payments and nothing else. These are the policies and
// guard triggers in supabase/migrations/20260922020000..20260922040000, checked as real
// signed-in users, so they need those three files to have been run.
const f = new Fixture()
let cashier: TestUser
let parent: TestUser
let teacher: TestUser
let studentId: string
let feeId: string

const feeRow = async (id: string) => (await f.admin.from('payments').select('*').eq('id', id).single()).data!

beforeAll(async () => {
  cashier = await f.user('cashier', 'cashier')
  parent = await f.user('parent', 'cashierparent')
  teacher = await f.user('teacher', 'cashierteacher')
  studentId = await f.student(parent)
  await f.admin.from('wallets').upsert({ parent_id: parent.id, balance: 100 })
  const { data, error } = await f.admin
    .from('payments')
    .insert({ student_id: studentId, amount: 500, fee_type: 'tuition', description: 'Test fee', status: 'pending' })
    .select('id')
    .single()
  if (error || !data) throw new Error(`payment insert failed: ${error?.message}`)
  feeId = data.id
}, 120_000)

afterAll(async () => {
  await f.admin.from('wallet_requests').delete().eq('parent_id', parent.id)
  await f.admin.from('payments').delete().eq('student_id', studentId)
  await f.admin.from('wallets').delete().eq('parent_id', parent.id)
  await f.cleanup()
})

describe('what a cashier can see', () => {
  it('reads the payments, wallets and the parent and student names that go with them', async () => {
    expect((await cashier.client.from('payments').select('id').eq('id', feeId)).data).toHaveLength(1)
    expect((await cashier.client.from('wallets').select('parent_id').eq('parent_id', parent.id)).data).toHaveLength(1)
    expect((await cashier.client.from('students').select('id').eq('id', studentId)).data).toHaveLength(1)
    expect((await cashier.client.from('profiles').select('id').eq('id', parent.id)).data).toHaveLength(1)
  })
  it('does not see teacher profiles, applications or feedback', async () => {
    expect((await cashier.client.from('profiles').select('id').eq('id', teacher.id)).data).toHaveLength(0)
    expect((await cashier.client.from('applications').select('id').limit(1)).data ?? []).toHaveLength(0)
    expect((await cashier.client.from('feedback').select('id').limit(1)).data ?? []).toHaveLength(0)
  })
})

describe('recording and marking cash payments', () => {
  it('cannot change what a fee is', async () => {
    await cashier.client.from('payments').update({ amount: 1 }).eq('id', feeId)
    expect((await feeRow(feeId)).amount).toBe(500)
  })
  it('cannot create an unpaid fee or a non-cash payment', async () => {
    const pending = await cashier.client.from('payments').insert({ student_id: studentId, amount: 10, fee_type: 'other', status: 'pending' })
    expect(pending.error).not.toBeNull()
    const wallet = await cashier.client
      .from('payments')
      .insert({ student_id: studentId, amount: 10, fee_type: 'other', status: 'paid', payment_method: 'wallet' })
    expect(wallet.error).not.toBeNull()
  })
  it('can record a cash payment and mark an unpaid fee as paid in cash', async () => {
    const recorded = await cashier.client
      .from('payments')
      .insert({ student_id: studentId, amount: 50, fee_type: 'other', description: 'Uniform', status: 'paid', payment_method: 'cash', recorded_by: cashier.id })
    expect(recorded.error).toBeNull()
    const paid = await cashier.client
      .from('payments')
      .update({ status: 'paid', payment_method: 'cash', transaction_date: new Date().toISOString(), recorded_by: cashier.id })
      .eq('id', feeId)
      .select('id')
    expect(paid.error).toBeNull()
    expect((await feeRow(feeId)).status).toBe('paid')
  })
  it('cannot reverse a payment or delete a row', async () => {
    await cashier.client.from('payments').update({ status: 'pending', payment_method: null }).eq('id', feeId)
    expect((await feeRow(feeId)).status).toBe('paid')
    await cashier.client.from('payments').delete().eq('id', feeId)
    expect((await feeRow(feeId)).id).toBe(feeId)
  })
  it('cannot write the corrections history or the wallet ledger', async () => {
    const adjustment = await cashier.client.from('payment_adjustments').insert({ payment_id: feeId, action: 'waived', reason: 'not allowed', created_by: cashier.id })
    expect(adjustment.error).not.toBeNull()
    const ledger = await cashier.client.from('wallet_transactions').insert({ parent_id: parent.id, amount: 5, balance_after: 105, created_by: cashier.id })
    expect(ledger.error).not.toBeNull()
  })
})

describe('wallet top-up requests', () => {
  it('can approve a pending request and credit the wallet, but only as the reviewer', async () => {
    const { data: request } = await f.admin.from('wallet_requests').insert({ parent_id: parent.id, requested_amount: 200 }).select('id').single()
    const forged = await cashier.client.from('wallet_requests').update({ status: 'approved', approved_amount: 200, reviewed_by: parent.id }).eq('id', request!.id)
    expect(forged.error).not.toBeNull()

    const approved = await cashier.client
      .from('wallet_requests')
      .update({ status: 'approved', approved_amount: 200, reviewed_by: cashier.id, reviewed_at: new Date().toISOString() })
      .eq('id', request!.id)
      .select('id')
    expect(approved.error).toBeNull()
    const credited = await cashier.client.from('wallets').update({ balance: 300 }).eq('parent_id', parent.id).select('parent_id')
    expect(credited.error).toBeNull()
    expect((await f.admin.from('wallets').select('balance').eq('parent_id', parent.id).single()).data?.balance).toBe(300)
  })
  it('cannot decide a request twice, or change the requested amount', async () => {
    const { data: request } = await f.admin.from('wallet_requests').insert({ parent_id: parent.id, requested_amount: 50 }).select('id').single()
    const changed = await cashier.client.from('wallet_requests').update({ status: 'denied', requested_amount: 5000, reviewed_by: cashier.id }).eq('id', request!.id)
    expect(changed.error).not.toBeNull()
    await f.admin.from('wallet_requests').update({ status: 'denied' }).eq('id', request!.id)
    const again = await cashier.client.from('wallet_requests').update({ status: 'approved', approved_amount: 50, reviewed_by: cashier.id }).eq('id', request!.id)
    expect(again.error).not.toBeNull()
  })
})
