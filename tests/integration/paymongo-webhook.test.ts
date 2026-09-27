import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handlePaymongoEvent } from '@/lib/paymongo-webhook'
import { Fixture, type TestUser } from './helpers'

// The PayMongo webhook's business logic, run against the real database with
// a fake receipt-emailer and a fake notifier (nothing is ever sent) — same
// shape as receipt-email.test.ts. Requires this branch's migration
// (20260927150000_paymongo_gateway.sql) to have been run, since it needs
// 'paymongo' as an allowed payments.payment_method and the
// payment_gateway_sessions table.
const f = new Fixture()
let parent: TestUser
let child: string

const pendingFee = async (amount: number) => {
  const { data, error } = await f.admin
    .from('payments')
    .insert({ student_id: child, amount, fee_type: 'other', description: `Test fee ${amount}`, status: 'pending', due_date: '2030-01-01' })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message)
  return data.id as string
}

// The exact JSON nesting a real PayMongo webhook uses for metadata was not
// confirmed against their docs (see the plan's documentation-gap note);
// this mirrors extractMetadata()'s first candidate path. If a real test
// delivery turns out to nest it differently, update both this fixture and
// extractMetadata() together.
function fakeEvent(type: string, paymentId: string, parentId: string) {
  return {
    data: {
      attributes: {
        type,
        data: { attributes: { metadata: { payment_id: paymentId, parent_id: parentId } } },
      },
    },
  }
}

type Notified = { userIds: string[]; title: string }
const run = async (event: unknown) => {
  const emails: string[] = []
  const notifications: Notified[] = []
  const result = await handlePaymongoEvent(
    {
      admin: f.admin,
      emailReceipt: async (paymentId: string) => {
        emails.push(paymentId)
        return { sent: 1, skippedOptOut: 0, errors: [] }
      },
      notify: async (userIds: string[], input: { title: string }) => {
        notifications.push({ userIds, title: input.title })
      },
    },
    event
  )
  return { result, emails, notifications }
}

beforeAll(async () => {
  parent = await f.user('parent', 'paymongopayer')
  child = await f.student(parent)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('handlePaymongoEvent', () => {
  it('marks a pending fee paid, logs it, emails the receipt, and notifies the payer', async () => {
    const id = await pendingFee(150)
    const { result, emails, notifications } = await run(fakeEvent('payment.paid', id, parent.id))

    expect(result).toEqual({ handled: true, duplicate: false, paymentId: id })
    expect(emails).toEqual([id])
    expect(notifications).toEqual([{ userIds: [parent.id], title: 'Payment received' }])

    const { data } = await f.admin.from('payments').select('status, payment_method, recorded_by').eq('id', id).single()
    expect(data).toEqual({ status: 'paid', payment_method: 'paymongo', recorded_by: parent.id })
  })

  it('is idempotent: a duplicate delivery of the same event is a no-op', async () => {
    const id = await pendingFee(200)
    await run(fakeEvent('payment.paid', id, parent.id))
    const { result, emails } = await run(fakeEvent('payment.paid', id, parent.id))

    expect(result).toEqual({ handled: true, duplicate: true })
    expect(emails).toEqual([]) // second delivery must not re-email
  })

  it('ignores an event type it does not care about', async () => {
    const id = await pendingFee(75)
    const { result, emails } = await run(fakeEvent('payment.failed', id, parent.id))

    expect(result).toEqual({ handled: false, reason: 'ignored event type: payment.failed', retryable: false })
    expect(emails).toEqual([])
    const { data } = await f.admin.from('payments').select('status').eq('id', id).single()
    expect(data?.status).toBe('pending')
  })

  it('reports, but does not throw on, an event with no metadata', async () => {
    const { result } = await run({ data: { attributes: { type: 'payment.paid' } } })
    expect(result).toEqual({
      handled: false,
      reason: 'missing metadata.payment_id or metadata.parent_id',
      retryable: false,
    })
  })

  it('reports, but does not throw on, a payment id that does not exist', async () => {
    const { result } = await run(fakeEvent('payment.paid', '00000000-0000-0000-0000-000000000000', parent.id))
    expect(result).toEqual({ handled: false, reason: 'payment not found', retryable: false })
  })
})
