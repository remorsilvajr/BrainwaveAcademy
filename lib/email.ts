import nodemailer from 'nodemailer'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })

  await transporter.sendMail({
    from: `"Brainwave Preschool Academy" <${process.env.BREVO_SENDER_EMAIL}>`,
    to,
    subject,
    html,
  })
}

// For user-typed text (a reason, an admin's note) placed inside an email body.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
