import { escapeHtml } from '@/lib/email'
import { formatCurrency, formatDateLong } from '@/lib/format'

// Subject and HTML for every notification email, as pure functions so what a
// parent actually receives can be checked without sending anything. Anything a
// person typed (a reason, a note, a name) goes through escapeHtml.
export type Mail = { subject: string; html: string }

function shell(heading: string, body: string, siteUrl: string, cta: { label: string; path: string } = { label: 'Log in', path: '/login' }): string {
  return `
    <h2>${escapeHtml(heading)}</h2>
    ${body}
    <p><a href="${siteUrl}${cta.path}">${escapeHtml(cta.label)}</a></p>
    <p style="color:#666;font-size:12px">Brainwave Preschool Academy</p>
  `
}

export function enrollmentRejectedEmail(input: {
  parentFirstName: string
  studentName: string
  reason: string
  siteUrl: string
}): Mail {
  return {
    subject: `About your enrollment request for ${input.studentName}`,
    html: shell(
      'Your enrollment request',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, thank you for applying to Brainwave Preschool Academy for <strong>${escapeHtml(input.studentName)}</strong>.</p>
       <p>We're not able to accept this request at this time.</p>
       <p><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>
       <p>If you have questions, or you'd like to apply again, please contact the school office or submit a new request.</p>`,
      input.siteUrl,
      { label: 'Visit our website', path: '/' }
    ),
  }
}

// For a parent who already has an account (a second child): approval never sent
// them anything before, since the welcome email carries a new password.
export function enrollmentApprovedExistingParentEmail(input: { parentFirstName: string; studentName: string; siteUrl: string }): Mail {
  return {
    subject: `Enrollment request approved for ${input.studentName}`,
    html: shell(
      'Enrollment request approved',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, we've approved the enrollment request for <strong>${escapeHtml(input.studentName)}</strong>.</p>
       <p>Log in to your portal and open <strong>Requirements</strong> to upload the documents we need. Once they're verified, ${escapeHtml(input.studentName)} is enrolled.</p>`,
      input.siteUrl
    ),
  }
}

export function walletDecisionEmail(input: {
  parentFirstName: string
  approved: boolean
  requestedAmount: number
  approvedAmount: number | null
  note: string | null
  siteUrl: string
}): Mail {
  if (input.approved) {
    const different = input.approvedAmount !== null && input.approvedAmount !== input.requestedAmount
    return {
      subject: 'Your wallet top-up was approved',
      html: shell(
        'Wallet top-up approved',
        `<p>Hi ${escapeHtml(input.parentFirstName)}, your request for ${formatCurrency(input.requestedAmount)} was approved.</p>
         <p><strong>${formatCurrency(input.approvedAmount ?? input.requestedAmount)}</strong> has been added to your wallet${different ? ' (the school approved a different amount than requested)' : ''}.</p>
         ${input.note ? `<p><strong>Note from the school:</strong> ${escapeHtml(input.note)}</p>` : ''}`,
        input.siteUrl,
        { label: 'View your wallet', path: '/parent/payments' }
      ),
    }
  }
  return {
    subject: 'About your wallet top-up request',
    html: shell(
      'Wallet top-up not approved',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, we weren't able to approve your request for ${formatCurrency(input.requestedAmount)}.</p>
       ${input.note ? `<p><strong>Note from the school:</strong> ${escapeHtml(input.note)}</p>` : ''}
       <p>If you have questions, please contact the school office.</p>`,
      input.siteUrl,
      { label: 'View your payments', path: '/parent/payments' }
    ),
  }
}

export type DueFee = { studentName: string; description: string; amount: number; dueDate: string; overdue: boolean }

export function feeReminderEmail(input: { parentFirstName: string; fees: DueFee[]; siteUrl: string }): Mail {
  const overdue = input.fees.filter((f) => f.overdue)
  const soon = input.fees.filter((f) => !f.overdue)
  const list = (fees: DueFee[]) =>
    `<ul>${fees
      .map(
        (f) =>
          `<li>${escapeHtml(f.studentName)}: ${escapeHtml(f.description)}, ${formatCurrency(f.amount)}, due ${formatDateLong(f.dueDate)}</li>`
      )
      .join('')}</ul>`
  return {
    subject: overdue.length > 0 ? 'A school fee is past due' : 'A school fee is due soon',
    html: shell(
      'Fee reminder',
      `<p>Hi ${escapeHtml(input.parentFirstName)},</p>
       ${overdue.length > 0 ? `<p><strong>Past due:</strong></p>${list(overdue)}` : ''}
       ${soon.length > 0 ? `<p><strong>Due soon:</strong></p>${list(soon)}` : ''}
       <p>You can pay from your wallet in the portal. If you've already paid, please ignore this reminder.</p>`,
      input.siteUrl,
      { label: 'View your payments', path: '/parent/payments' }
    ),
  }
}

export type AlbumDigestEntry = { classroomName: string; count: number }

export function albumDigestEmail(input: { parentFirstName: string; date: string; entries: AlbumDigestEntry[]; siteUrl: string }): Mail {
  const total = input.entries.reduce((sum, e) => sum + e.count, 0)
  return {
    subject: `New photos from school (${total})`,
    html: shell(
      'New photos in the album',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, teachers shared new photos on ${formatDateLong(input.date)}:</p>
       <ul>${input.entries.map((e) => `<li>${escapeHtml(e.classroomName)}: ${e.count} photo${e.count === 1 ? '' : 's'}</li>`).join('')}</ul>`,
      input.siteUrl,
      { label: 'Open the album', path: `/parent/album/${input.date}` }
    ),
  }
}
