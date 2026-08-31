'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity-log'
import { sendEmail } from '@/lib/email'
import { generateTempPassword } from '@/lib/password'
import { getSiteUrl } from '@/lib/site-url'

// Called from ChangePasswordForm after a successful client-side
// supabase.auth.updateUser() call — the password change itself has to go
// through the browser client (it re-authenticates with the current
// password first), so this only records the audit-trail entry.
export async function logPasswordChanged() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Changed account password',
    targetTable: 'profiles',
    targetId: user?.id,
  })
}

// Self-service alternative to the /forgot-password flow, reachable from
// inside Settings while still logged in. Deliberately does NOT go through
// Supabase Auth's own reset-link system (resetPasswordForEmail) — that's
// wired to Postmark (see CLAUDE.md's password-reset note), which is still
// in trial mode and only delivers to addu.edu.ph addresses. This sends a
// freshly generated password directly via this app's own lib/email.ts
// (Brevo), which isn't domain-restricted, so it works for any user right
// now. Once the Postmark account is approved, the same real reset-link
// flow Supabase Auth already provides becomes viable for everyone and this
// pre-generated-password approach can be retired in favor of it.
export async function requestPasswordResetEmail() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('Your session has expired. Please log in again.')
  }

  const newPassword = generateTempPassword()
  const siteUrl = getSiteUrl()

  // Send the email BEFORE actually changing the password, not after — if
  // this were reversed and sendEmail failed (Brevo down, bad address,
  // etc.), the password would already be changed with no way for the user
  // to know the new value, locking them out with no recovery path. Sending
  // first means a failure here just fails the request cleanly, leaving
  // their existing (still-working) password untouched.
  await sendEmail({
    to: user.email,
    subject: 'Your Brainwave Preschool Academy password has been reset',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset from your Settings page.</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
      <p>Use this to log in, then change it to something memorable from Settings &gt; Password &amp; Security.</p>
      <p>If you didn't request this, contact the school office — your password has already changed.</p>
      <p><a href="${siteUrl}/login">Log in</a></p>
    `,
  })

  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (updateError) {
    throw new Error(updateError.message)
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Requested password reset email',
    targetTable: 'profiles',
    targetId: user.id,
  })
}
