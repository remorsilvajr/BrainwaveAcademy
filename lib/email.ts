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
