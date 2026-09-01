import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyRememberMe } from '@/lib/supabase/remember-me'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // See lib/supabase/remember-me.ts — this runs on every request
          // (getUser() below refreshes the token whenever it's near
          // expiry), so it's what actually keeps a "not remembered" login
          // from quietly becoming persistent again on the next refresh.
          const rememberMe = request.cookies.get('remember_me')?.value !== 'false'
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, applyRememberMe(name, value, options, rememberMe))
          )
        },
      },
    }
  )

  // Refreshes the session cookie if it's expired — required for auth to
  // keep working across page loads. Do not remove this call.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A Server Action invocation (form action / useActionState / a plain
  // async-function call from a Client Component) POSTs to the same URL the
  // page was rendered at, carrying this header. Next.js's client-side action
  // runtime expects a specific action-response envelope back, not a raw
  // HTTP redirect — if middleware's own NextResponse.redirect() below fires
  // for one of these requests (e.g. a /login tab left open in the
  // background while the user authenticates in another tab, then submits
  // the stale form once the shared cookies already show them logged in),
  // the client blows up with "An unexpected response was received from the
  // server" instead of anything resembling the intended redirect. A
  // Server Action's own `redirect()` call already integrates correctly with
  // that protocol, so for these requests we skip straight to letting the
  // action run — auth/role checks still happen there (most already check
  // `auth.getUser()`, and RLS backs up the rest), just without middleware's
  // page-navigation-oriented redirect getting in the way.
  const isServerAction = request.headers.has('next-action')

  const path = request.nextUrl.pathname
  const protectedPaths = ['/parent', '/teacher', '/admin']
  const isProtected = protectedPaths.some((p) => path.startsWith(p))

  if (isServerAction) {
    return supabaseResponse
  }

  // Logged-in users have no reason to see the public marketing/auth pages —
  // e.g. hitting /login or the landing page while already signed in should
  // land them back on their own dashboard, not show the public page.
  // /reset-password and /auth/confirm are deliberately excluded: the
  // password-reset flow creates a real session via those routes, and
  // redirecting away from them would break resetting your password while
  // already logged in (or mid-reset).
  const publicOnlyPaths = ['/', '/login', '/enroll', '/forgot-password']
  const isPublicOnly = publicOnlyPaths.includes(path)

  // Not logged in, trying to reach a protected section -> send to login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // app/login/actions.ts already refuses a blocked account at sign-in, but
  // that was the *only* enforcement point — an account blocked while
  // already logged in (a tab left open, or Force Log Out below) kept full
  // access until they happened to log out and back in, since nothing
  // re-checked account_status on an existing session. Mirrors the
  // user_role caching pattern right below, but with a much shorter TTL
  // (60s, not 1h) — role changes are rare and low-stakes to leave briefly
  // stale, but "should this blocked account still be in the portal" isn't,
  // so this deliberately re-queries far more often at some perf cost.
  // Also set server-side (see toggleBlockUser/forceLogoutUser in
  // app/admin/user-management/actions.ts) as the same admin action also
  // sets a real Supabase Auth ban_duration, which independently fails
  // getUser() above on this same request without waiting on this cookie at
  // all — this cookie check is a second, guaranteed-consistent layer for
  // wherever ban_duration's propagation is slower than expected, not the
  // only thing standing between a blocked account and continued access.
  if (user && isProtected) {
    let accountStatus = request.cookies.get('account_status')?.value

    if (!accountStatus) {
      const { data: statusProfile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single()

      accountStatus = statusProfile?.account_status
      if (accountStatus) {
        supabaseResponse.cookies.set('account_status', accountStatus, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60,
        })
      }
    }

    if (accountStatus === 'blocked') {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'This account has been blocked. Contact the school.')
      return NextResponse.redirect(url)
    }

    // Throttled "last seen" ping for the admin's Online indicator in User
    // Management — at most one write per ~60s per user (gated by a cookie,
    // not a DB read, so a stale-but-present cookie skips the query
    // entirely) regardless of how many pages they navigate in that window.
    // An unthrottled write on every single request would reintroduce
    // exactly the kind of per-navigation DB cost the user_role cookie
    // above was specifically added to avoid.
    if (!request.cookies.get('presence_ping')?.value) {
      supabaseResponse.cookies.set('presence_ping', '1', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60,
      })
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)
    }
  }

  // Logged in -> make sure they're inside their OWN role's section (e.g. a
  // parent hitting /admin/* gets bounced back to /parent), and keep them
  // off the public-only pages above.
  //
  // Perf: role is cached in a cookie (set at login, see app/login/actions.ts)
  // so this doesn't need a DB round trip on every single navigation — that
  // was the single biggest contributor to slow sidebar navigation, since
  // middleware runs on every protected-route request. Falls back to a real
  // query only when the cookie is missing (e.g. an older session from
  // before this cache existed, or it expired), and re-caches the result.
  if (user && (isProtected || isPublicOnly)) {
    let role = request.cookies.get('user_role')?.value

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      role = profile?.role
      if (role) {
        supabaseResponse.cookies.set('user_role', role, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        })
      }
    }

    if (isPublicOnly) {
      const url = request.nextUrl.clone()
      url.pathname = `/${role ?? 'parent'}`
      return NextResponse.redirect(url)
    }

    if (role && !path.startsWith(`/${role}`)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${role}`
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
