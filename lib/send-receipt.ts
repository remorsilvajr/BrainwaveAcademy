import type { SupabaseClient } from '@supabase/supabase-js'
import { paymentReceiptEmail, type Mail } from '@/lib/notification-emails'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'

// Emails the receipt for a fee that has just been paid. Written against injected
// dependencies (a service-role client, a mailer, the site URL) so it can be run in a test
// with a fake mailer, like lib/daily-notifications.ts. Best effort by design: it never
// throws, because the payment it describes has already happened and must not be reported as
// failed because an email was.
//
// Who gets it: a wallet payment goes to the parent who paid (payments.recorded_by) when
// they are one of the child's guardians; anything else (cash recorded by the school) goes
// to every active guardian. A guardian who switched email notifications off in Settings
// gets none: that toggle promises "billing receipts", and the receipt is still in their
// portal.
export type ReceiptDeps = {
  admin: SupabaseClient
  send: (to: string, mail: Mail) => Promise<void>
  siteUrl: string
}

export type ReceiptSummary = { sent: number; skippedOptOut: number; errors: string[] }

export async function sendPaymentReceipt(deps: ReceiptDeps, paymentId: string): Promise<ReceiptSummary> {
  const summary: ReceiptSummary = { sent: 0, skippedOptOut: 0, errors: [] }
  try {
    const { admin, send, siteUrl } = deps

    const { data: payment } = await admin
      .from('payments')
      .select('id, student_id, amount, description, fee_type, payment_method, transaction_date, receipt_ref, status, recorded_by')
      .eq('id', paymentId)
      .maybeSingle()
    if (!payment || payment.status !== 'paid') return summary

    const [{ data: student }, { data: links }] = await Promise.all([
      admin.from('students').select('first_name, last_name').eq('id', payment.student_id).maybeSingle(),
      admin.from('parent_student').select('parent_id').eq('student_id', payment.student_id),
    ])
    if (!student) return summary

    const guardianIds = (links ?? []).map((l) => l.parent_id)
    if (guardianIds.length === 0) return summary
    const recipientIds = payment.payment_method === 'wallet' && payment.recorded_by && guardianIds.includes(payment.recorded_by) ? [payment.recorded_by] : guardianIds

    const { data: parents } = await admin
      .from('profiles')
      .select('id, email, first_name, email_notifications_enabled')
      .in('id', recipientIds)
      .eq('role', 'parent')
      .eq('account_status', 'active')
      .is('deleted_at', null)

    const label = payment.description || `${payment.fee_type.charAt(0).toUpperCase()}${payment.fee_type.slice(1)} fee`
    for (const parent of parents ?? []) {
      if (!parent.email_notifications_enabled) {
        summary.skippedOptOut += 1
        continue
      }
      try {
        await send(
          parent.email,
          paymentReceiptEmail({
            parentFirstName: parent.first_name,
            studentName: `${student.first_name} ${student.last_name}`,
            receiptRef: payment.receipt_ref,
            description: label,
            amount: payment.amount,
            method: payment.payment_method,
            paidAt: payment.transaction_date,
            paymentId: payment.id,
            siteUrl,
          })
        )
        summary.sent += 1
      } catch (err) {
        summary.errors.push(`receipt email failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    summary.errors.push(`receipt lookup failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (summary.errors.length > 0) console.error(summary.errors.join('; '))
  return summary
}

// What the Server Actions call: the real database and mailer.
export async function emailReceiptFor(paymentId: string): Promise<ReceiptSummary> {
  return sendPaymentReceipt(
    { admin: createAdminClient(), send: (to, mail) => sendEmail({ to, subject: mail.subject, html: mail.html }), siteUrl: getSiteUrl() },
    paymentId
  )
}
