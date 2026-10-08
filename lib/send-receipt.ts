import type { SupabaseClient } from '@supabase/supabase-js'
import { paymentReceiptEmail, type Mail } from '@/lib/notification-emails'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'

// Emails the receipt for one payment_transactions row — one installment, not
// necessarily a fee's full amount, since a fee can now be paid in partial
// installments (see the Payments & wallet note in CLAUDE.md). Written
// against injected dependencies (a service-role client, a mailer, the site
// URL) so it can be run in a test with a fake mailer, like
// lib/daily-notifications.ts. Best effort by design: it never throws,
// because the payment it describes has already happened and must not be
// reported as failed because an email was.
//
// Who gets it: a payment the parent made themselves (online, or the old wallet) goes to the parent who paid (the
// transaction's own recorded_by) when they are one of the child's
// guardians; anything else (cash recorded by the school) goes to every
// active guardian. A guardian who switched email notifications off in
// Settings gets none: that toggle promises "billing receipts", and the
// receipt is still in their portal.
export type ReceiptDeps = {
  admin: SupabaseClient
  send: (to: string, mail: Mail) => Promise<void>
  siteUrl: string
}

export type ReceiptSummary = { sent: number; skippedOptOut: number; errors: string[] }

export async function sendPaymentReceipt(deps: ReceiptDeps, transactionId: string): Promise<ReceiptSummary> {
  const summary: ReceiptSummary = { sent: 0, skippedOptOut: 0, errors: [] }
  try {
    const { admin, send, siteUrl } = deps

    const { data: transaction } = await admin
      .from('payment_transactions')
      .select('id, payment_id, amount, payment_method, recorded_by, transaction_date, receipt_ref')
      .eq('id', transactionId)
      .maybeSingle()
    if (!transaction) return summary

    const { data: payment } = await admin
      .from('payments')
      .select('id, student_id, description, fee_type')
      .eq('id', transaction.payment_id)
      .maybeSingle()
    if (!payment) return summary

    const [{ data: student }, { data: links }] = await Promise.all([
      admin.from('students').select('first_name, last_name').eq('id', payment.student_id).maybeSingle(),
      admin.from('parent_student').select('parent_id').eq('student_id', payment.student_id),
    ])
    if (!student) return summary

    const guardianIds = (links ?? []).map((l) => l.parent_id)
    if (guardianIds.length === 0) return summary
    const recipientIds =
      ['wallet', 'card', 'gcash'].includes(transaction.payment_method) && transaction.recorded_by && guardianIds.includes(transaction.recorded_by)
        ? [transaction.recorded_by]
        : guardianIds

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
            receiptRef: transaction.receipt_ref,
            description: label,
            amount: transaction.amount,
            method: transaction.payment_method,
            paidAt: transaction.transaction_date,
            paymentId: payment.id,
            transactionId: transaction.id,
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
export async function emailReceiptFor(transactionId: string): Promise<ReceiptSummary> {
  return sendPaymentReceipt(
    { admin: createAdminClient(), send: (to, mail) => sendEmail({ to, subject: mail.subject, html: mail.html }), siteUrl: getSiteUrl() },
    transactionId
  )
}
