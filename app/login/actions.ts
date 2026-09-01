'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rememberMe = formData.get('remember-me') === 'on'

  // Must be set BEFORE createClient()/signInWithPassword() below — its
  // setAll() reads this same cookie (via the same request-scoped cookie
  // jar) to decide whether the sb-* auth cookies it's about to write should
  // be session-only. See lib/supabase/remember-me.ts.
  const cookieStore = await cookies()
  cookieStore.set('remember_me', rememberMe ? 'true' : 'false', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  })

  const supabase = await createClient()

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
  cookieStore.set('user_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })

  redirect(`/${role}`)
}

// Deliberately does NOT call redirect() here — this is invoked as a plain
// function call from a client onClick, not a form submission, and a
// redirect() thrown from a Server Action in that context wasn't reliably
// reaching the client in this dev environment (left the "Logging out…"
// button stuck forever, with nothing to recover it since the throw meant
// the client's own code after the call never ran either). The caller
// navigates itself once this resolves.
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('user_role')
  cookieStore.delete('remember_me')
  cookieStore.delete('account_status')
  cookieStore.delete('presence_ping')
}

// Same not-calling-redirect() reasoning as logout() above. scope: 'global'
// invalidates every refresh token for this user, not just this session's —
// signs them out of every device, not only this browser.
export async function logoutAllDevices() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'global' })

  const cookieStore = await cookies()
  cookieStore.delete('user_role')
  cookieStore.delete('remember_me')
  cookieStore.delete('account_status')
  cookieStore.delete('presence_ping')
}