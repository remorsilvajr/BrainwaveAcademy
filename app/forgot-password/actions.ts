'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const siteUrl = getSiteUrl()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  })

  // Logged server-side only (status/code, never the address): a rate limit or
  // SMTP failure would otherwise be invisible, since the user always sees the
  // same "on its way" message. Supabase returns success for an unknown email,
  // so anything reaching here is a real delivery/config problem, not a probe.
  if (error) {
    console.error(`Password reset email failed: ${error.status ?? ''} ${error.code ?? ''} ${error.message}`.trim())
  }

  // Always resolves the same way whether or not the email exists, so this
  // page can't be used to check which addresses are registered.
}