import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// Partial payments: pay_amount_with_wallet spreads a chosen amount over a
// child's unpaid fees (soonest due first), and reverse_payment undoes what is
// still counted on one fee, refunding only the wallet part not already
// refunded. These are supabase/migrations/20261008130000, ..140000 and
// ..150000, checked as real signed-in users.
const f = new Fixture()
let parent: TestUser
let otherParent: TestUser
let admin: TestUser
let child: string
let feeA: string // 1000, due first
let feeB: string // 2000, due later

const fee = async (id: string) => (await f.admin.from('payments').select('status, amount_paid').eq('id', id).single()).data!
const balance = async (parentId: string) => Number((await f.admin.from('wallets').select('balance').eq('parent_id', parentId).single()).data!.balance)
const history = async (id: string) =>
  (await f.admin.from('payment_transactions').select('amount, payment_method, receipt_ref, reversed_at').eq('payment_id', id).order('transaction_date')).data ?? []
const pay = (who: TestUser, amount: number) => who.client.rpc('pay_amount_with_wallet', { p_student_id: child, p_amount: amount })

beforeAll(async () => {
  parent = await f.user('parent', 'partial')
  otherParent = await f.user('parent', 'partialother')
  admin = await f.user('admin', 'partial')
  child = await f.student(parent)
  await f.admin.from('wallets').upsert([
    { parent_id: parent.id, balance: 3000 },
    { parent_id: otherParent.id, balance: 3000 },
  ])
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

describe('paying part of what is owed from the wallet', () => {
  it('pays the soonest-due fee first and leaves the next one partly paid', async () => {
    const { data, error } = await pay(parent, 1500)
    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    expect(await fee(feeA)).toMatchObject({ status: 'paid', amount_paid: 1000 })
    expect(await fee(feeB)).toMatchObject({ status: 'pending', amount_paid: 500 })
    expect(await balance(parent.id)).toBe(1500)
    const [row] = await history(feeB)
    expect(row).toMatchObject({ amount: 500, payment_method: 'wallet', reversed_at: null })
    expect(row.receipt_ref).toMatch(/^RCT-\d{4}-T\d{4}$/)
  })

  it('refuses more than is still owed, a fraction of a centavo, and changes nothing', async () => {
    expect((await pay(parent, 1500.01)).error?.message).toContain('AMOUNT_EXCEEDS_OUTSTANDING')
    expect((await pay(parent, 0.001)).error?.message).toContain('INVALID_AMOUNT')
    expect((await pay(parent, 0)).error?.message).toContain('INVALID_AMOUNT')
    expect(await balance(parent.id)).toBe(1500)
    expect((await fee(feeB)).amount_paid).toBe(500)
  })

  it("refuses another family's child and a wallet that is too small", async () => {
    expect((await pay(otherParent, 100)).error?.message).toContain('NOT_AUTHORIZED')
    await f.admin.from('wallets').update({ balance: 50 }).eq('parent_id', parent.id)
    expect((await pay(parent, 100)).error?.message).toContain('INSUFFICIENT_BALANCE')
    expect((await fee(feeB)).amount_paid).toBe(500)
    await f.admin.from('wallets').update({ balance: 1500 }).eq('parent_id', parent.id)
  })
})

describe('reversing a partly paid fee', () => {
  it('only an admin can reverse', async () => {
    const { error } = await parent.client.rpc('reverse_payment', { p_payment_id: feeB, p_reason: 'trying it' })
    expect(error).not.toBeNull()
    expect((await fee(feeB)).amount_paid).toBe(500)
  })

  it('refunds the wallet part, clears the fee and marks its history reversed', async () => {
    const { error } = await admin.client.rpc('reverse_payment', { p_payment_id: feeB, p_reason: 'paid by mistake' })
    expect(error).toBeNull()
    expect(await fee(feeB)).toMatchObject({ status: 'pending', amount_paid: 0 })
    expect(await balance(parent.id)).toBe(2000)
    expect((await history(feeB)).every((r) => r.reversed_at !== null)).toBe(true)
    // The other fee is untouched.
    expect(await fee(feeA)).toMatchObject({ status: 'paid', amount_paid: 1000 })
  })

  it('a second reversal refunds only what was paid since the first', async () => {
    expect((await pay(parent, 300)).error).toBeNull()
    expect(await balance(parent.id)).toBe(1700)
    const { error } = await admin.client.rpc('reverse_payment', { p_payment_id: feeB, p_reason: 'paid by mistake again' })
    expect(error).toBeNull()
    expect(await balance(parent.id)).toBe(2000)
    expect(await fee(feeB)).toMatchObject({ status: 'pending', amount_paid: 0 })
  })

  it('a fee with nothing paid cannot be reversed', async () => {
    const { error } = await admin.client.rpc('reverse_payment', { p_payment_id: feeB, p_reason: 'nothing to undo' })
    expect(error?.message).toContain('PAYMENT_NOT_PAID')
  })
})
