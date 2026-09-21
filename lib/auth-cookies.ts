import type { cookies } from 'next/headers'
import { SECURE_COOKIES } from '@/lib/supabase/secure-cookie'

type CookieStore = Awaited<ReturnType<typeof cookies>>

// The cookies a fresh login needs alongside Supabase's own session cookies. Shared
// by login() (app/login/actions.ts) and the public enroll form, which now signs a
// new parent in right after creating their account.

// Must run BEFORE signInWithPassword(): lib/supabase/server.ts's setAll() reads this
// same cookie to decide whether the sb-* auth cookies it is about to write should be
// session-only. See lib/supabase/remember-me.ts.
export function setRememberMeCookie(cookieStore: CookieStore, rememberMe: boolean) {
  cookieStore.set('remember_me', rememberMe ? 'true' : 'false', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  })
}

// The per-user cached markers middleware.ts would otherwise set reactively. Setting
// them at sign-in means a shared browser never inherits the previous person's stale
// role/status cookie, and the new user is correct from the first request.
export function setSessionMarkerCookies(cookieStore: CookieStore, role: string, accountStatus: string) {
  const base = { httpOnly: true, secure: SECURE_COOKIES, sameSite: 'lax' as const, path: '/' }
  // Cached so middleware doesn't re-query profiles.role on every navigation.
  cookieStore.set('user_role', role, { ...base, maxAge: 60 * 60 })
  // Matches middleware.ts's own account_status TTL.
  cookieStore.set('account_status', accountStatus, { ...base, maxAge: 60 * 5 })
  // Suppresses a duplicate "last seen" ping for the first minute.
  cookieStore.set('presence_ping', '1', { ...base, maxAge: 60 })
}
