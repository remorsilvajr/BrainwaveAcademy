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

// Sent whenever admin approves an enrollment request. The parent already has an
// account (they created it, with their own password, when they submitted the
// form), so this only says what happens next.
export function enrollmentApprovedEmail(input: { parentFirstName: string; studentName: string; note?: string | null; siteUrl: string }): Mail {
  return {
    subject: `Enrollment request approved for ${input.studentName}`,
    html: shell(
      'Enrollment request approved',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, we've approved the enrollment request for <strong>${escapeHtml(input.studentName)}</strong>.</p>
       ${input.note ? `<p><strong>Note from the school:</strong> ${escapeHtml(input.note)}</p>` : ''}
       <p>Log in to your portal and open <strong>Requirements</strong> to upload the documents we need. Once they're verified, ${escapeHtml(input.studentName)} is enrolled.</p>`,
      input.siteUrl,
      { label: 'Open your portal', path: '/parent/requirements' }
    ),
  }
}

// Admin asked for changes to the details on the request itself (not a document).
export function enrollmentCorrectionEmail(input: { parentFirstName: string; studentName: string; note: string; siteUrl: string }): Mail {
  return {
    subject: `Please update your enrollment request for ${input.studentName}`,
    html: shell(
      'A correction is needed',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, thank you for applying for <strong>${escapeHtml(input.studentName)}</strong>. Before we can approve the request, we need a small correction.</p>
       <p><strong>Note from the school:</strong> ${escapeHtml(input.note)}</p>
       <p>Log in, open <strong>Enrollment Status</strong>, update the details and resubmit. We'll review it again right away.</p>`,
      input.siteUrl,
      { label: 'Update your request', path: '/parent/enrollment-status' }
    ),
  }
}

// The one place an account owner is sent a way to choose a password. The link is
// the only secret in it; it opens a page that asks for a click before it is used
// (see app/auth/set-password), and it stops working after it is used once or after
// the Auth project's one-time-link expiry.
export function setPasswordEmail(input: { firstName: string; url: string; kind: 'welcome' | 'reset'; forAccount?: string }): Mail {
  const welcome = input.kind === 'welcome'
  return {
    subject: welcome ? 'Set your password for Brainwave Preschool Academy' : 'Reset your Brainwave Preschool Academy password',
    html: shell(
      welcome ? 'Welcome to Brainwave Preschool Academy' : 'Reset your password',
      `<p>Hi ${escapeHtml(input.firstName)},</p>
       ${input.forAccount ? `<p><strong>For account:</strong> ${escapeHtml(input.forAccount)}</p>` : ''}
       <p>${welcome ? 'An account has been created for you.' : 'You asked to reset your password.'} Use the button below to choose your own password. Nobody at the school ever sees it.</p>
       <p style="color:#666;font-size:13px">This link works once and expires soon. If it has expired, choose <em>Forgot Password?</em> on the login page to get a new one. If you did not expect this email, you can ignore it.</p>`,
      '',
      { label: welcome ? 'Set my password' : 'Choose a new password', path: input.url }
    ),
  }
}

// Sent to the account owner when a super admin set their password for them, so a
// change they did not ask for is never silent. Never contains the password.
export function passwordChangedByAdminEmail(input: { firstName: string; siteUrl: string }): Mail {
  return {
    subject: 'Your Brainwave Preschool Academy password was changed',
    html: shell(
      'Your password was changed',
      `<p>Hi ${escapeHtml(input.firstName)}, a school administrator has set a new password for your account, and you have been signed out everywhere.</p>
       <p>The school will give you the new password directly. If you were not expecting this, please contact the school office right away.</p>`,
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

export type DocumentCorrection = { label: string; note: string }

// Admin asked the parent to re-upload specific documents, with a note on each saying what
// is wrong. Notes are typed by an admin, so they go through escapeHtml.
export function documentCorrectionEmail(input: {
  parentFirstName: string
  studentName: string
  items: DocumentCorrection[]
  siteUrl: string
}): Mail {
  return {
    subject: `Action needed: documents for ${input.studentName}`,
    html: shell(
      'Documents need to be resubmitted',
      `<p>Hi ${escapeHtml(input.parentFirstName)}, a few documents for <strong>${escapeHtml(input.studentName)}</strong>'s enrollment need to be resubmitted:</p>
       <ul>${input.items
         .map((i) => `<li><strong>${escapeHtml(i.label)}</strong>${i.note ? `: ${escapeHtml(i.note)}` : ''}</li>`)
         .join('')}</ul>
       <p>Please log in, open <strong>Requirements</strong> and upload corrected copies.</p>`,
      input.siteUrl,
      { label: 'Open Requirements', path: '/parent/requirements' }
    ),
  }
}
