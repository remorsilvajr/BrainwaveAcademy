import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// Super admin fee deletion: delete_fee moves a fee with nothing paid (and its
// history) into deleted_payments, restore_fee puts it back exactly as it was,
// and nobody else can do either or read the record.
// supabase/migrations/20261009120000_super_admin_delete_fees.sql.
const f = new Fixture()
let superAdmin: TestUser
let admin: TestUser
let parent: TestUser
let child: string

const fee = async (extra: Record<string, unknown> = {}) => {
  const { data, error } = await f.admin
    .from('payments')
    .insert({ student_id: child, amount: 800, fee_type: 'other', description: 'ZZ Delete me', status: 'pending', ...extra })
    .select('id, receipt_ref')
    .single()
  if (error || !data) throw new Error(error?.message)
  return data
}
const exists = async (id: string) => (await f.admin.from('payments').select('id').eq('id', id)).data!.length === 1
const archived = async (id: string) => (await f.admin.from('deleted_payments').select('*').eq('id', id).maybeSingle()).data

beforeAll(async () => {
  superAdmin = await f.user('admin', 'delsuper')
  await f.admin.from('profiles').update({ is_super_admin: true }).eq('id', superAdmin.id)
  admin = await f.user('admin', 'delregular')
  parent = await f.user('parent', 'delparent')
  child = await f.student(parent)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('deleting a fee', () => {
  it('a regular admin and a parent cannot', async () => {
    const { id } = await fee()
    expect((await admin.client.rpc('delete_fee', { p_payment_id: id, p_reason: 'not allowed' })).error?.message).toContain('NOT_SUPER_ADMIN')
    expect((await parent.client.rpc('delete_fee', { p_payment_id: id, p_reason: 'not allowed' })).error).not.toBeNull()
    expect(await exists(id)).toBe(true)
  })

  it('needs a reason, and refuses a fee with something paid toward it', async () => {
    const { id } = await fee()
    expect((await superAdmin.client.rpc('delete_fee', { p_payment_id: id, p_reason: 'no' })).error?.message).toContain('REASON_REQUIRED')
    const paid = await fee({ amount_paid: 100 })
    expect((await superAdmin.client.rpc('delete_fee', { p_payment_id: paid.id, p_reason: 'added twice' })).error?.message).toContain('HAS_PAYMENTS')
    expect(await exists(paid.id)).toBe(true)
  })

  it('a super admin deletes an unpaid fee into the record, with its history, and restores it exactly', async () => {
    const original = await fee({ due_date: '2031-03-01' })
    // A correction on it, and a reversed payment row: both must survive the round trip.
    await f.admin.from('payment_adjustments').insert({ payment_id: original.id, action: 'edited', reason: 'amount fixed', created_by: admin.id })
    await f.admin.from('payment_transactions').insert({ payment_id: original.id, amount: 50, payment_method: 'cash', reversed_at: new Date().toISOString() })

    const { error } = await superAdmin.client.rpc('delete_fee', { p_payment_id: original.id, p_reason: 'added twice by mistake' })
    expect(error).toBeNull()
    expect(await exists(original.id)).toBe(false)
    const record = await archived(original.id)
    expect(record).toMatchObject({ student_id: child, reason: 'added twice by mistake', deleted_by: superAdmin.id })
    expect(record.adjustments).toHaveLength(1)
    expect(record.transactions).toHaveLength(1)

    // Nobody but the functions / service role reads the record.
    expect((await admin.client.from('deleted_payments').select('id').eq('id', original.id)).data ?? []).toHaveLength(0)
    expect((await admin.client.rpc('restore_fee', { p_payment_id: original.id })).error?.message).toContain('NOT_SUPER_ADMIN')

    expect((await superAdmin.client.rpc('restore_fee', { p_payment_id: original.id })).error).toBeNull()
    const { data: back } = await f.admin.from('payments').select('amount, due_date, receipt_ref, status').eq('id', original.id).single()
    expect(back).toMatchObject({ amount: 800, due_date: '2031-03-01', receipt_ref: original.receipt_ref, status: 'pending' })
    expect((await f.admin.from('payment_adjustments').select('id').eq('payment_id', original.id)).data).toHaveLength(1)
    expect((await f.admin.from('payment_transactions').select('id').eq('payment_id', original.id)).data).toHaveLength(1)
    expect(await archived(original.id)).toBeNull()
  })
})
