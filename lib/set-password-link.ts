import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'
import { setPasswordEmail } from '@/lib/notification-emails'

// Sends an account owner a one-time link to choose their own password, in place of
// ever emailing (or having an admin pick) a password. Server-only.
//
// The link is built from a token generated with the service role and goes through
// /auth/set-password, a page that needs a click before the token is used. That click
// matters: mail scanners and link-preview bots open URLs in emails, and a one-time
// token opened by a bot is spent before the person clicks it (this is what broke
// the Brevo-relayed reset emails before). Only the person's own click POSTs it.
//
// `to` overrides the recipient (the admin "email me a reset" pin) while the link
// stays for `email`'s account. The link is never logged.
export async function sendSetPasswordEmail(input: {
  email: string
  firstName: string
  kind: 'welcome' | 'reset'
  to?: string
  forAccount?: string
}): Promise<{ error: string } | undefined> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: input.email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) {
    return { error: 'Could not create the password link. Please try again.' }
  }

  const url = `${getSiteUrl()}/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
  const mail = setPasswordEmail({ firstName: input.firstName, url, kind: input.kind, forAccount: input.forAccount })
  try {
    await sendEmail({ to: input.to ?? input.email, subject: mail.subject, html: mail.html })
  } catch (err) {
    console.error('sendEmail failed for the set-password link:', err instanceof Error ? err.message : err)
    return { error: 'The email could not be sent. Please try again.' }
  }
}
