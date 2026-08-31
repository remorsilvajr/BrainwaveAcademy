'use server'

import { createClient } from '@/lib/supabase/server'
import { requireEnv } from '@/lib/env'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const siteUrl = requireEnv('NEXT_PUBLIC_SITE_URL')
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  })

  // Always resolves the same way whether or not the email exists, so this
  // page can't be used to check which addresses are registered.
}