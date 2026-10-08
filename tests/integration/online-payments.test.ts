import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anon, Fixture, type TestUser } from './helpers'

// Online payments (sandbox): pay_amount_online may only be called by the
// server (service role), after its checkout accepted the payment. A parent or a
// visitor calling it directly must be refused, or anyone could mark fees paid
// without paying. supabase/migrations/20261008160000_online_sandbox_payments.sql.
const f = new Fixture()
let parent: TestUser
let otherParent: TestUser
let child: string
let feeA: string
let feeB: string

const fee = async (id: string) => (await f.admin.from('payments').select('status, amount_paid, payment_method, recorded_by').eq('id', id).single()).data!
const payAsServer = (parentId: string, amount: number, method = 'card') =>
  f.admin.rpc('pay_amount_online', { p_parent_id: parentId, p_student_id: child, p_amount: amount, p_method: method, p_note: 'Visa ending 1111' })

beforeAll(async () => {
  parent = await f.user('parent', 'online')
  otherParent = await f.user('parent', 'onlineother')
  child = await f.student(parent)
  await f.admin.from('wallets').upsert({ parent_id: parent.id, balance: 2500 })
  const { data } = await f.admin
    .from('payments')
    .insert([
      { student_id: child, amount: 1000, fee_type: 'activity', description: 'Activity', status: 'pending', due_date: '2031-01-10' },
      { student_id: child, amount: 2000, fee_type: 'tuition', description: 'Tuition', status: 'pending', due_date: '2031-02-10' },
    ])
    .select('id, amount')
  feeA = data!.find((r) => Number(r.amount) === 1000)!.id
  feeB = data!.find((r) => Number(r.amount) === 2000)!.id
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('pay_amount_online', () => {
  it('a parent or a visitor cannot call it directly', async () => {
    const asParent = await parent.client.rpc('pay_amount_online', { p_parent_id: parent.id, p_student_id: child, p_amount: 100, p_method: 'card', p_note: 'x' })
    expect(asParent.error).not.toBeNull()
    const asVisitor = await anon().rpc('pay_amount_online', { p_parent_id: parent.id, p_student_id: child, p_amount: 100, p_method: 'card', p_note: 'x' })
    expect(asVisitor.error).not.toBeNull()
    expect((await fee(feeA)).amount_paid).toBe(0)
  })

  it('refuses a parent who is not linked to the child, and an unknown method', async () => {
    expect((await payAsServer(otherParent.id, 100)).error?.message).toContain('NOT_AUTHORIZED')
    expect((await payAsServer(parent.id, 100, 'wallet')).error?.message).toContain('INVALID_METHOD')
    expect((await payAsServer(parent.id, 3000.01)).error?.message).toContain('AMOUNT_EXCEEDS_OUTSTANDING')
  })

  it('pays soonest due first, records the method, payer and note, and never touches the wallet', async () => {
    const { data, error } = await payAsServer(parent.id, 1500)
    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    expect(await fee(feeA)).toMatchObject({ status: 'paid', amount_paid: 1000, payment_method: 'card', recorded_by: parent.id })
    expect(await fee(feeB)).toMatchObject({ status: 'pending', amount_paid: 500 })
    const { data: rows } = await f.admin.from('payment_transactions').select('payment_method, note, receipt_ref').eq('payment_id', feeB)
    expect(rows).toEqual([expect.objectContaining({ payment_method: 'card', note: 'Visa ending 1111' })])
    const { data: wallet } = await f.admin.from('wallets').select('balance').eq('parent_id', parent.id).single()
    expect(Number(wallet!.balance)).toBe(2500)
  })

  it('GCash works the same way', async () => {
    const { error } = await payAsServer(parent.id, 1500, 'gcash')
    expect(error).toBeNull()
    expect(await fee(feeB)).toMatchObject({ status: 'paid', amount_paid: 2000, payment_method: 'gcash' })
  })
})
