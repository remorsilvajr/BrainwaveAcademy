import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// Paying a fee from the wallet moves money and flips the fee to paid in one step.
const f = new Fixture()
let parent: TestUser
let other: TestUser
let child: string

const fee = async (amount: number) => {
  const { data, error } = await f.admin
    .from('payments')
    .insert({ student_id: child, amount, fee_type: 'other', description: `Test fee ${amount}`, status: 'pending', due_date: '2030-01-01' })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message)
  return data.id as string
}
const balance = async (user: TestUser) => {
  const { data } = await f.admin.from('wallets').select('balance').eq('parent_id', user.id).single()
  return Number(data?.balance)
}

beforeAll(async () => {
  parent = await f.user('parent', 'payer')
  other = await f.user('parent', 'stranger')
  child = await f.student(parent)
  await f.admin.from('wallets').insert([{ parent_id: parent.id, balance: 1000 }, { parent_id: other.id, balance: 1000 }])
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('pay_fee_with_wallet', () => {
  it('debits the wallet and marks the fee paid together', async () => {
    const id = await fee(300)
    const { error } = await parent.client.rpc('pay_fee_with_wallet', { p_payment_id: id })
    expect(error).toBeNull()
    expect(await balance(parent)).toBe(700)
    const { data } = await f.admin.from('payments').select('status, payment_method').eq('id', id).single()
    expect(data).toEqual({ status: 'paid', payment_method: 'wallet' })
  })

  it('cannot pay the same fee twice', async () => {
    const id = await fee(100)
    await parent.client.rpc('pay_fee_with_wallet', { p_payment_id: id })
    const again = await parent.client.rpc('pay_fee_with_wallet', { p_payment_id: id })
    expect(again.error).not.toBeNull()
    expect(await balance(parent)).toBe(600)
  })

  it('changes nothing when the wallet is too small', async () => {
    const id = await fee(5000)
    const { error } = await parent.client.rpc('pay_fee_with_wallet', { p_payment_id: id })
    expect(error).not.toBeNull()
    expect(await balance(parent)).toBe(600)
    const { data } = await f.admin.from('payments').select('status').eq('id', id).single()
    expect(data?.status).toBe('pending')
  })

  it("cannot pay another family's fee from your own wallet", async () => {
    const id = await fee(50)
    const { error } = await other.client.rpc('pay_fee_with_wallet', { p_payment_id: id })
    expect(error).not.toBeNull()
    expect(await balance(other)).toBe(1000)
    const { data } = await f.admin.from('payments').select('status').eq('id', id).single()
    expect(data?.status).toBe('pending')
  })
})
