import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Where to go after a link is verified. Only a path on this site: `next` comes from
// the URL (or a form), and `new URL('//evil.example', base)` would otherwise send a
// person to another site right after they proved who they are.
function safeNext(value: string | null | undefined, fallback = '/reset-password'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

const OTP_TYPES: EmailOtpType[] = ['recovery', 'invite', 'email', 'signup', 'magiclink', 'email_change']

function invalidLink(request: NextRequest) {
  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent('That reset link is invalid or has expired.'), request.url)
  )
}

// The reset link Supabase itself emails (Forgot Password): a `code` or a token hash
// in the query string.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()

  // Newer Supabase projects send a `code` param (PKCE flow).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Older/alternate email templates send `token_hash` + `type` instead.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return invalidLink(request)
}

// The set-your-own-password link this app emails (see lib/set-password-link.ts):
// /auth/set-password shows a button that POSTs the token here, so opening the email
// (or a scanner fetching the URL) never uses it up.
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const token_hash = String(form.get('token_hash') ?? '')
  const type = String(form.get('type') ?? '') as EmailOtpType
  const next = safeNext(String(form.get('next') ?? ''))

  if (!token_hash || !OTP_TYPES.includes(type)) return invalidLink(request)

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) return invalidLink(request)

  // 303 so the browser follows a POST with a GET of the page.
  return NextResponse.redirect(new URL(next, request.url), 303)
}
