'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // TODO: switch back to using process.env.NEXT_PUBLIC_SITE_URL once we
  // figure out why it isn't loading (it printed `undefined` in testing).
  // Hardcoded for now since everyone's testing on their own localhost:3000.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `http://localhost:3000/auth/confirm?next=/reset-password`,
  })

  // Always resolves the same way whether or not the email exists, so this
  // page can't be used to check which addresses are registered.
}