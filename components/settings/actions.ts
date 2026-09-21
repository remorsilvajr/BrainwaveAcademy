'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { validateNewPassword } from '@/lib/password'
import { sendSetPasswordEmail } from '@/lib/set-password-link'

// Change your own password while logged in. Done here, not in the browser, so the
// rules in lib/password.ts (length, character mix, not your name/email, not a common
// or breached password) are actually enforced: a browser-side check can be skipped.
// The current password is verified first, so an unlocked, still-logged-in screen
// can't be used to take over the account. The passwords are never logged.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Your session has expired. Please log in again.' }
  if (!currentPassword) return { error: 'Enter your current password.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const problem = await validateNewPassword(newPassword, confirmPassword, {
    email: user.email,
    names: [profile?.first_name, profile?.last_name],
  })
  if (problem) return { error: problem }
  if (newPassword === currentPassword) return { error: 'Your new password must be different from your current one.' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: 'Current password is incorrect.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'Could not update your password. Please try again.' }

  // A changed password should end every other session of this account (someone who
  // had it, or a stolen device, is locked out), but not the one the person is using.
  await supabase.auth.signOut({ scope: 'others' })

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Changed account password',
    targetTable: 'profiles',
    targetId: user.id,
  })
}

// Choose a new password from the recovery session a reset or set-password link
// opened (app/auth/confirm). Same rules as changePassword, without the current
// password, which the person doesn't have.
export async function resetPassword(newPassword: string, confirmPassword: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'This link has expired. Please request a new one from the login page.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const problem = await validateNewPassword(newPassword, confirmPassword, {
    email: user.email,
    names: [profile?.first_name, profile?.last_name],
  })
  if (problem) return { error: problem }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'Could not update your password. Please request a new link and try again.' }

  // Logged before the sign-out below: the audit insert needs the session.
  await logActivity(supabase, {
    actorId: user.id,
    action: 'Set a new password from an emailed link',
    targetTable: 'profiles',
    targetId: user.id,
  })

  // The password changed, so every device signed in to this account is signed out,
  // including this one (the form then sends the person to the login page to use it).
  await supabase.auth.signOut({ scope: 'global' })
}

// Self-service alternative to /forgot-password from inside Settings. Emails a
// one-time link to choose a new password; no password is ever generated, sent or
// stored by the app. Goes through this app's own mailer (Brevo) rather than Supabase
// Auth's (Postmark, capped at 100 emails a month), which is why the link is built
// by lib/set-password-link.ts and used through a click-to-continue page.
export async function requestPasswordResetEmail(): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  // TEMPORARY, requested 2026-09-01: admin's own reset link always goes to this
  // fixed inbox instead of the requesting admin's real address, regardless of which
  // admin account asks. Parent/teacher are unaffected. The link is still for the
  // actual logged-in admin account; only the destination is overridden, so the
  // email says which account it is for. Remove the override (send to user.email)
  // once no longer needed.
  const isAdmin = profile?.role === 'admin'
  const accountLabel = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  const failure = await sendSetPasswordEmail({
    email: user.email,
    firstName: profile?.first_name ?? 'there',
    kind: 'reset',
    to: isAdmin ? 'rsilva1@addu.edu.ph' : user.email,
    forAccount: isAdmin ? `${accountLabel} (${user.email})` : undefined,
  })
  if (failure) return failure

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Requested password reset email',
    targetTable: 'profiles',
    targetId: user.id,
  })
}
