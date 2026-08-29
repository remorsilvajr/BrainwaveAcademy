'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // TEMPORARY DEBUG: showing the real Supabase error message so we can
    // see exactly what's being rejected. Revert this to the generic
    // message below once login is working — showing detailed auth errors
    // to real users makes it easier for attackers to guess valid emails.
    redirect(`/login?error=${encodeURIComponent('DEBUG: ' + error.message)}`)
    // redirect(`/login?error=${encodeURIComponent('Incorrect email or password.')}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const { data: statusCheck } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', data.user.id)
    .single()

  if (statusCheck?.account_status === 'blocked') {
    await supabase.auth.signOut()
    redirect(`/login?error=${encodeURIComponent('This account has been blocked. Contact the school.')}`)
  }

  redirect(`/${profile?.role ?? 'parent'}`)
}