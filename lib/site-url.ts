import { requireEnv } from '@/lib/env'

// Strips a trailing slash so every caller can safely do
// `${getSiteUrl()}/some/path` without risking a doubled slash. Bit a real
// production password-reset flow when NEXT_PUBLIC_SITE_URL was set with a
// trailing slash in Vercel — the resulting redirect_to became
// `.../auth//confirm`, which Supabase's own verify step (upstream of our
// app entirely) treated as enough of a mismatch to fail the token exchange.
export function getSiteUrl() {
  return requireEnv('NEXT_PUBLIC_SITE_URL').replace(/\/+$/, '')
}
