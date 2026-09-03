import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '@/lib/env'
import { applyRememberMe } from '@/lib/supabase/remember-me'
import { SECURE_COOKIES } from '@/lib/supabase/secure-cookie'

// Use this inside Server Components, Server Actions, and Route Handlers.
// Must be awaited: const supabase = await createClient()
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            // Absent or 'true' -> remembered (matches Supabase's own
            // default); only an explicit 'false' shortens the sb-* cookies
            // to session-only. See lib/supabase/remember-me.ts.
            const rememberMe = cookieStore.get('remember_me')?.value !== 'false'
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...applyRememberMe(name, value, options, rememberMe),
                secure: SECURE_COOKIES,
              })
            )
          } catch {
            // Called from a Server Component — safe to ignore because
            // the middleware below refreshes the session on every request.
          }
        },
      },
    }
  )
}
