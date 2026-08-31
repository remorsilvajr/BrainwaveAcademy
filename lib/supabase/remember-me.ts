import type { CookieOptions } from '@supabase/ssr'

// "Remember me" at login is tracked via our own `remember_me` cookie (see
// app/login/actions.ts) rather than anything Supabase itself exposes —
// @supabase/ssr always issues its `sb-*` auth cookies with its own
// long-lived expiry, on every write, including on every token refresh
// (middleware.ts calls getUser() on nearly every request, which silently
// re-issues these cookies). So this has to run everywhere those cookies get
// (re)written, not just once at sign-in, or the very next refresh quietly
// turns a "not remembered" session back into a persistent one.
export function applyRememberMe(name: string, value: string, options: CookieOptions, rememberMe: boolean): CookieOptions {
  if (rememberMe || !name.startsWith('sb-')) return options

  // Never touch a deletion write (@supabase/ssr signs out by writing
  // value: '' with maxAge: 0 — see node_modules/@supabase/ssr/dist/main/
  // cookies.js's removeItem). Stripping maxAge/expires from *that* write
  // turns "delete this cookie now" into "keep it, but as a session
  // cookie" — which silently breaks signOut() for exactly the sessions
  // this file exists to shorten. A real repro during testing: log in with
  // "Remember me" off, then log out — the session survived because of
  // this exact bug.
  if (value === '' || (options.maxAge !== undefined && options.maxAge <= 0)) return options

  const sessionOnly = { ...options }
  delete sessionOnly.maxAge
  delete sessionOnly.expires
  return sessionOnly
}
