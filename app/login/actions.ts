'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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
    redirect(`/login?error=${encodeURIComponent('Incorrect email or password.')}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', data.user.id)
    .single()

  if (profile?.account_status === 'blocked') {
    await supabase.auth.signOut()
    redirect(`/login?error=${encodeURIComponent('This account has been blocked. Contact the school.')}`)
  }

  const role = profile?.role ?? 'parent'

  // Cached so middleware doesn't have to re-query profiles.role on every
  // single navigation — see middleware.ts. Short-lived so a role change
  // (rare for this app) is picked up again soon rather than staying stale
  // for the rest of the session.
  const cookieStore = await cookies()
  cookieStore.set('user_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })

  redirect(`/${role}`)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('user_role')

  redirect('/login')
}