'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { setRememberMeCookie, setSessionMarkerCookies } from '@/lib/auth-cookies'

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

const BLOCKED_ACCOUNT_MESSAGE = 'This account has been blocked. Contact the school.'

export async function login(formData: FormData) {
  // Normalized the same way profiles.email is stored elsewhere in this app
  // (see e.g. app/enroll/actions.ts) — without this, "User@x.com" and
  // "user@x.com" would count as different lockout targets and let an
  // attacker dodge the limit by varying case.
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const password = formData.get('password') as string
  const rememberMe = formData.get('remember-me') === 'on'

  // Must be set BEFORE createClient()/signInWithPassword() below (see
  // lib/auth-cookies.ts).
  const cookieStore = await cookies()
  setRememberMeCookie(cookieStore, rememberMe)

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
    // Blocking sets a real Supabase Auth ban, so a blocked account fails right
    // here with `user_banned` (for a right or wrong password alike) and never
    // reaches the profile check below. Without this it read as a plain
    // "Incorrect email or password". `user_banned` also covers the brief 15s
    // ban "Log Out" uses and soft-deleted accounts, so the message is only
    // shown when profiles really says 'blocked'; anything else falls through
    // to the generic error. Not counted as a failed attempt: the password was
    // never the problem, and guessing can't succeed against a banned account.
    if (error.code === 'user_banned') {
      const { data: bannedProfile } = await admin
        .from('profiles')
        .select('account_status')
        .eq('email', email)
        .is('deleted_at', null)
        .maybeSingle()
      if (bannedProfile?.account_status === 'blocked') {
        redirect(`/login?error=${encodeURIComponent(BLOCKED_ACCOUNT_MESSAGE)}`)
      }
    }

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
    redirect(`/login?error=${encodeURIComponent(BLOCKED_ACCOUNT_MESSAGE)}`)
  }

  const role = profile?.role ?? 'parent'

  // role/account_status/presence_ping are otherwise only ever set reactively by
  // middleware.ts. Setting them here means logging in as a different account in
  // the same browser can't inherit the previous user's stale cookies (a real bug
  // reported live), and last_seen_at below is set at the moment they became active.
  setSessionMarkerCookies(cookieStore, role, profile?.account_status ?? 'active')
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

  // scope: 'local' is required: supabase-js's default for signOut() is
  // 'global', which ends every session of this account on every device. That
  // made a plain Log Out on one browser (or one lab PC sharing a login) sign
  // the same account out everywhere, i.e. the "random" logouts; the separate
  // logoutAllDevices() below is the only place that should do that. Proven
  // in tests/integration/auth-sessions.test.ts.
  await supabase.auth.signOut({ scope: 'local' })

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