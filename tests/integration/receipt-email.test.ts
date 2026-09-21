import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sendPaymentReceipt } from '@/lib/send-receipt'
import type { Mail } from '@/lib/notification-emails'
import { Fixture, type TestUser } from './helpers'

// Who gets the receipt email when a fee is paid, run against the real database with a fake
// mailer (nothing is ever sent). The rules: a wallet payment goes to the parent who paid, a
// cash payment recorded by the school goes to every guardian, a guardian who turned email
// notifications off gets none, and a fee that is not paid sends nothing.
const f = new Fixture()
let payer: TestUser
let otherGuardian: TestUser
let optedOut: TestUser
let stranger: TestUser
let admin: TestUser
let child: string

type Sent = { to: string; mail: Mail }
const run = async (paymentId: string, failFor?: string) => {
  const sent: Sent[] = []
  const summary = await sendPaymentReceipt(
    {
      admin: f.admin,
      siteUrl: 'https://school.test',
      send: async (to, mail) => {
        if (to === failFor) throw new Error('mail server down')
        sent.push({ to, mail })
      },
    },
    paymentId
  )
  return { sent, summary }
}

const pay = async (extra: Record<string, unknown>) => {
  const { data, error } = await f.admin
    .from('payments')
    .insert({
      student_id: child,
      amount: 1250.5,
      fee_type: 'tuition',
      description: 'Smart Explorers: Tuition',
      status: 'paid',
      transaction_date: new Date().toISOString(),
      ...extra,
    })
    .select('id, receipt_ref')
    .single()
  if (error || !data) throw new Error(error?.message)
  return data
}

beforeAll(async () => {
  payer = await f.user('parent', 'receiptpayer')
  otherGuardian = await f.user('parent', 'receiptother')
  optedOut = await f.user('parent', 'receiptoptout')
  stranger = await f.user('parent', 'receiptstranger')
  admin = await f.user('admin', 'receipt')
  child = await f.student(payer, { first_name: 'Receipt', last_name: 'Kid' })
  await f.admin.from('parent_student').insert([
    { parent_id: otherGuardian.id, student_id: child, relationship: 'Father' },
    { parent_id: optedOut.id, student_id: child, relationship: 'Guardian' },
  ])
  await f.admin.from('profiles').update({ email_notifications_enabled: false }).eq('id', optedOut.id)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('receipt emails', () => {
  it('a wallet payment goes only to the parent who paid, with the receipt details', async () => {
    const payment = await pay({ payment_method: 'wallet', recorded_by: payer.id })
    const { sent, summary } = await run(payment.id)
    expect(summary).toMatchObject({ sent: 1, errors: [] })
    expect(sent.map((s) => s.to)).toEqual([payer.email])
    const { mail } = sent[0]
    expect(mail.subject).toContain(payment.receipt_ref)
    expect(mail.subject).toContain('Receipt Kid')
    expect(mail.html).toContain('Smart Explorers: Tuition')
    expect(mail.html).toContain('1,250.50')
    expect(mail.html).toContain('Wallet')
    expect(mail.html).toContain(`/parent/payments/${payment.id}/receipt`)
  })

  it("a cash payment recorded by the school goes to every guardian, except one who turned emails off", async () => {
    const payment = await pay({ payment_method: 'cash', recorded_by: admin.id })
    const { sent, summary } = await run(payment.id)
    expect(sent.map((s) => s.to).sort()).toEqual([otherGuardian.email, payer.email].sort())
    expect(summary).toMatchObject({ sent: 2, skippedOptOut: 1 })
    expect(sent[0].mail.html).toContain('Cash')
  })

  it("a wallet payment whose payer isn't a guardian of the child goes to the guardians instead", async () => {
    const payment = await pay({ payment_method: 'wallet', recorded_by: stranger.id })
    const { sent } = await run(payment.id)
    expect(sent.map((s) => s.to)).not.toContain(stranger.email)
    expect(sent.map((s) => s.to).sort()).toEqual([otherGuardian.email, payer.email].sort())
  })

  it('a fee that is not paid sends nothing', async () => {
    const payment = await pay({ payment_method: null, status: 'pending', transaction_date: null })
    const { sent, summary } = await run(payment.id)
    expect(sent).toHaveLength(0)
    expect(summary.sent).toBe(0)
  })

  it('a failed email is reported but never thrown, and the others still go out', async () => {
    const payment = await pay({ payment_method: 'cash', recorded_by: admin.id })
    const { sent, summary } = await run(payment.id, payer.email)
    expect(sent.map((s) => s.to)).toEqual([otherGuardian.email])
    expect(summary.sent).toBe(1)
    expect(summary.errors[0]).toContain('mail server down')
  })

  it('an unknown payment sends nothing and does not throw', async () => {
    const { sent, summary } = await run('00000000-0000-0000-0000-000000000000')
    expect(sent).toHaveLength(0)
    expect(summary.errors).toEqual([])
  })
})
