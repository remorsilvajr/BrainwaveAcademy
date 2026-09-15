'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SECURE_COOKIES } from '@/lib/supabase/secure-cookie'

// Brute-force lockout: 5 failed attempts per email within a 5-minute
// sliding window blocks further attempts (even a correct password) until
// enough time passes for old failures to fall out of the window — no
// separate "locked_until" timestamp needed. Tracked in Postgres, not
// in-process memory: this runs on Vercel's serverless functions, which
// don't share memory across invocations or instances, so an in-memory
// counter would silently protect nothing in production.
const LOGIN_ATTEMPT_LIMIT = 5
const LOGIN_ATTEMPT_WINDOW_MINUTES = 5
// Only start warning once the visitor is close to being locked out —
// showing a countdown from the very first wrong password would just read
// as noise.
const LOGIN_ATTEMPT_WARNING_THRESHOLD = 3

export async function login(formData: FormData) {
  // Normalized the same way profiles.email is stored elsewhere in this app
  // (see e.g. app/enroll/actions.ts) — without this, "User@x.com" and
  // "user@x.com" would count as different lockout targets and let an
  // attacker dodge the limit by varying case.
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const password = formData.get('password') as string
  const rememberMe = formData.get('remember-me') === 'on'

  // Must be set BEFORE createClient()/signInWithPassword() below — its
  // setAll() reads this same cookie (via the same request-scoped cookie
  // jar) to decide whether the sb-* auth cookies it's about to write should
  // be session-only. See lib/supabase/remember-me.ts.
  const cookieStore = await cookies()
  cookieStore.set('remember_me', rememberMe ? 'true' : 'false', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  })

  // login_attempts has RLS enabled with zero policies, same as
  // ref_counters — it's only ever touched via this service-role client,
  // never a regular RLS-scoped one, so this doesn't need a requireAdmin()
  // check the way an admin-only mutation would (see lib/supabase/admin.ts's
  // own rule): there's no user to be an admin of yet at this point in the
  // login flow, and this table exposes nothing back to the caller beyond a
  // plain "too many attempts" message.
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString()

  // Drop this email's own stale attempts before counting — keeps the table
  // from growing unbounded without a scheduled cleanup job, matching this
  // app's existing "avoid a background job until there's a real shared need
  // for one" convention (see the Payments & wallet system's "Overdue" note).
  await admin.from('login_attempts').delete().eq('email', email).lt('attempted_at', windowStart)

  const { count: recentFailures } = await admin
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)

  if ((recentFailures ?? 0) >= LOGIN_ATTEMPT_LIMIT) {
    redirect(
      `/login?error=${encodeURIComponent(`Too many failed login attempts. Please try again in ${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes.`)}`
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await admin.from('login_attempts').insert({ email })

    // recentFailures was counted *before* this attempt, so this attempt is
    // failure number (recentFailures + 1) — the same number the top-of
    // -function check will compare against LOGIN_ATTEMPT_LIMIT next time.
    const remaining = LOGIN_ATTEMPT_LIMIT - ((recentFailures ?? 0) + 1)
    const warning =
      remaining <= LOGIN_ATTEMPT_WARNING_THRESHOLD
        ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before a temporary lockout.`
        : ''
    redirect(`/login?error=${encodeURIComponent(`Incorrect email or password.${warning}`)}`)
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
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })

  // account_status and presence_ping are otherwise only ever set
  // reactively by middleware.ts, never by login() itself — which is
  // exactly the bug reported live: logging in as a *different* account in
  // the same browser (cookies are shared per-browser, not per-identity)
  // could inherit a stale account_status cookie from whoever used this
  // browser last, and definitely inherited a still-valid presence_ping
  // cookie that suppressed the new user's very first "last seen" ping for
  // up to its own 60s TTL. Setting both explicitly here, plus last_seen_at
  // itself directly (more precise than waiting on middleware's next pass
  // anyway — this *is* the moment they became active), means a fresh
  // login is correct immediately, with nothing left for the next request
  // to sort out.
  cookieStore.set('account_status', profile?.account_status ?? 'active', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5, // matches middleware.ts's own account_status TTL
  })
  cookieStore.set('presence_ping', '1', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  })
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', data.user.id)

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

  // Without this, the admin's "Online" indicator (User Management) kept
  // showing green for up to the full 5-minute window after someone
  // explicitly logged out — last_seen_at only ever got *set* (by
  // middleware's presence ping), never cleared, so it just held whatever
  // it was at the moment of logout regardless of session state. Reported
  // live. Must run BEFORE signOut() below — profiles' self-update RLS
  // policy checks auth.uid(), which stops resolving to this user the
  // moment the session is actually torn down.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ last_seen_at: null }).eq('id', user.id)
  }

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

  // Same reasoning as logout() above — clear before signOut(), not after.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ last_seen_at: null }).eq('id', user.id)
  }

  await supabase.auth.signOut({ scope: 'global' })

  const cookieStore = await cookies()
  cookieStore.delete('user_role')
  cookieStore.delete('remember_me')
  cookieStore.delete('account_status')
  cookieStore.delete('presence_ping')
}