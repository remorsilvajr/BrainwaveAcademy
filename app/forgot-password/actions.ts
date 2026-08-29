'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // redirectTo points at the exchange route, which converts the emailed
  // link into a real logged-in session before landing on /reset-password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  })

  // Always resolves the same way whether or not the email exists, so this
  // page can't be used to check which addresses are registered.
}
