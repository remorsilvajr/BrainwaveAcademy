import { describe, expect, it } from 'vitest'
import { escapeHtml } from '@/lib/email'
import {
  albumDigestEmail,
  enrollmentApprovedEmail,
  enrollmentCorrectionEmail,
  enrollmentRejectedEmail,
  passwordChangedByAdminEmail,
  paymentReceiptEmail,
  setPasswordEmail,
  feeReminderEmail,
  walletDecisionEmail,
} from '@/lib/notification-emails'

const SITE = 'https://school.test'

describe('escapeHtml', () => {
  it('escapes the five characters that matter', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;')
  })
})

describe('notification emails escape everything a person typed', () => {
  const evil = '<script>alert(1)</script>'
  it('enrollment rejected', () => {
    const m = enrollmentRejectedEmail({ parentFirstName: 'Ana', studentName: 'Bo <i>Lee</i>', reason: evil, siteUrl: SITE })
    expect(m.html).not.toContain('<script>')
    expect(m.html).not.toContain('<i>Lee')
    expect(m.html).toContain('&lt;script&gt;')
    expect(m.html).toContain(SITE)
  })
  it('wallet decision, approved with a different amount', () => {
    const m = walletDecisionEmail({ parentFirstName: 'Ana', approved: true, requestedAmount: 1000, approvedAmount: 800, note: evil, siteUrl: SITE })
    expect(m.subject).toContain('approved')
    expect(m.html).toContain('800.00')
    expect(m.html).toContain('different amount')
    expect(m.html).not.toContain('<script>')
  })
  it('wallet decision, approved for exactly the requested amount does not mention a difference', () => {
    const m = walletDecisionEmail({ parentFirstName: 'Ana', approved: true, requestedAmount: 1000, approvedAmount: 1000, note: null, siteUrl: SITE })
    expect(m.html).not.toContain('different amount')
  })
  it('wallet decision, denied', () => {
    const m = walletDecisionEmail({ parentFirstName: 'Ana', approved: false, requestedAmount: 500, approvedAmount: null, note: 'Not this month', siteUrl: SITE })
    expect(m.html).toContain('500.00')
    expect(m.html).toContain('Not this month')
  })
  it('fee reminders escape child and fee names', () => {
    const m = feeReminderEmail({ parentFirstName: 'Ana', siteUrl: SITE, fees: [{ studentName: 'Zz<b>Kid', description: evil, amount: 1500, dueDate: '2026-09-25', overdue: false }] })
    expect(m.html).not.toContain('<b>Kid')
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('1,500.00')
  })
  it('album digest escapes class names', () => {
    const m = albumDigestEmail({ parentFirstName: 'Ana', date: '2026-09-21', siteUrl: SITE, entries: [{ classroomName: 'A <u>Class</u>', count: 2 }] })
    expect(m.html).not.toContain('<u>')
    expect(m.html).toContain('2 photos')
    expect(m.html).toContain('/parent/album/2026-09-21')
  })
  it('approved points to Requirements and escapes the admin note', () => {
    const m = enrollmentApprovedEmail({ parentFirstName: 'Ana', studentName: 'Bo Lee', note: evil, siteUrl: SITE })
    expect(m.html).toContain('Requirements')
    expect(m.html).not.toContain('<script>')
    expect(enrollmentApprovedEmail({ parentFirstName: 'Ana', studentName: 'Bo Lee', siteUrl: SITE }).html).not.toContain('Note from the school')
  })
  it('correction request shows the note (escaped) and points to Enrollment Status', () => {
    const m = enrollmentCorrectionEmail({ parentFirstName: 'Ana', studentName: 'Bo Lee', note: evil, siteUrl: SITE })
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
    expect(m.html).toContain('/parent/enrollment-status')
    expect(m.subject).toContain('Bo Lee')
  })
  it('the set-password email carries only the link, never a password', () => {
    const url = 'https://school.test/auth/set-password?token_hash=abc123&type=recovery'
    const welcome = setPasswordEmail({ firstName: 'Ana', url, kind: 'welcome' })
    expect(welcome.html).toContain(url)
    expect(welcome.html.toLowerCase()).not.toContain('temporary password')
    expect(welcome.html.toLowerCase()).not.toContain('your password is')
    const reset = setPasswordEmail({ firstName: '<b>Ana</b>', url, kind: 'reset', forAccount: 'A <i>Admin</i>' })
    expect(reset.html).not.toContain('<b>Ana')
    expect(reset.html).not.toContain('<i>Admin')
    expect(reset.subject).toContain('Reset')
  })
  it('the admin-changed-password notice never contains a password', () => {
    const m = passwordChangedByAdminEmail({ firstName: 'Ana', siteUrl: SITE })
    expect(m.html).toContain('signed out')
    expect(m.html.toLowerCase()).not.toContain('new password:')
  })
})

describe('fee reminder subject', () => {
  const fee = (overdue: boolean) => ({ studentName: 'K', description: 'T', amount: 1, dueDate: '2026-01-01', overdue })
  it('says past due when any fee is overdue, otherwise due soon', () => {
    expect(feeReminderEmail({ parentFirstName: 'A', siteUrl: SITE, fees: [fee(true)] }).subject).toContain('past due')
    expect(feeReminderEmail({ parentFirstName: 'A', siteUrl: SITE, fees: [fee(false)] }).subject).toContain('due soon')
    expect(feeReminderEmail({ parentFirstName: 'A', siteUrl: SITE, fees: [fee(false), fee(true)] }).subject).toContain('past due')
  })
})

describe('payment receipt email', () => {
  const base = {
    parentFirstName: 'Ana',
    studentName: 'Bo Lee',
    receiptRef: 'RCT-2026-0007',
    description: 'Smart Explorers: Tuition',
    amount: 4200,
    method: 'wallet',
    paidAt: '2026-09-21T02:00:00Z',
    paymentId: 'pay-123',
    siteUrl: SITE,
  }

  it('shows the receipt number, amount, method and date with a link to the printable receipt', () => {
    const m = paymentReceiptEmail(base)
    expect(m.subject).toBe('Payment receipt RCT-2026-0007 for Bo Lee')
    expect(m.html).toContain('RCT-2026-0007')
    expect(m.html).toContain('₱4,200.00')
    expect(m.html).toContain('Wallet')
    expect(m.html).toContain('September 21, 2026')
    expect(m.html).toContain('https://school.test/parent/payments/pay-123/receipt')
  })

  it('labels cash, and copes with a missing receipt number and date', () => {
    const m = paymentReceiptEmail({ ...base, method: 'cash', receiptRef: null, paidAt: null })
    expect(m.subject).toBe('Payment receipt for Bo Lee')
    expect(m.html).toContain('Cash')
    expect(m.html).not.toContain('Receipt no.')
  })

  it('escapes the fee description and names', () => {
    const m = paymentReceiptEmail({ ...base, description: '<script>alert(1)</script>', studentName: 'A <b>B</b>', parentFirstName: '<i>Ana</i>' })
    expect(m.html).not.toContain('<script>')
    expect(m.html).not.toContain('<b>B')
    expect(m.html).not.toContain('<i>Ana')
    expect(m.html).toContain('&lt;script&gt;')
  })
})
