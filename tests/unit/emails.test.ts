import { describe, expect, it } from 'vitest'
import { escapeHtml } from '@/lib/email'
import {
  albumDigestEmail,
  enrollmentApprovedExistingParentEmail,
  enrollmentRejectedEmail,
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
  it('approved for an existing parent points to Requirements', () => {
    const m = enrollmentApprovedExistingParentEmail({ parentFirstName: 'Ana', studentName: 'Bo Lee', siteUrl: SITE })
    expect(m.html).toContain('Requirements')
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
