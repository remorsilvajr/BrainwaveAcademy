import { createHash, randomBytes } from 'node:crypto'
import { PASSWORD_MAX_BYTES, passwordRequirements } from '@/lib/password-rules'

// Passwords are never stored, logged or emailed by this app. Supabase Auth keeps
// only a bcrypt hash (so a database or backup leak exposes hashes, not passwords),
// and every place that sets one runs it through validateNewPassword() on the
// server first. Nothing here returns or echoes the password itself.
//
// Server-only (Node crypto). The requirement list lives in lib/password-rules.ts
// (plain data, safe for a client form to show live), but the client never decides:
// the server action re-checks everything.

export { PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES, passwordRequirements } from '@/lib/password-rules'

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', '12345678', '123456789', '1234567890',
  '11111111', '00000000', 'qwertyui', 'qwerty123', 'qwertyuiop', 'abc12345', 'abcd1234', 'iloveyou', 'welcome1',
  'welcome123', 'admin123', 'letmein1', 'monkey123', 'dragon123', 'football1', 'baseball1', 'sunshine1', 'princess1',
  'brainwave', 'brainwave1', 'brainwave123', 'brainwave2026', 'tagumcity', 'philippines', 'mabuhay1', 'maryjane1',
])

function normalized(password: string) {
  return password.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) return true
  // "Password1!" and "Qwerty123" style variations of the same handful of words
  const stripped = normalized(password).replace(/\d+$/, '')
  return stripped.length > 0 && COMMON_PASSWORDS.has(stripped) && stripped.length <= 12
}

// true = found in a known breach, false = not found, null = couldn't check (the
// lookup is a courtesy and must never block someone from setting a password when
// the service is down). k-anonymity: only the first 5 characters of the SHA-1 of
// the password leave this server, never the password or its full hash.
export async function isPasswordBreached(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return null
    const body = await response.text()
    for (const line of body.split('\n')) {
      const [candidate, count] = line.trim().split(':')
      if (candidate === suffix) return Number(count) > 0
    }
    return false
  } catch {
    return null
  }
}

export type PasswordContext = { email?: string | null; names?: (string | null | undefined)[] }

// The first problem with a proposed new password, as a sentence for the user, or
// null when it is fine. `confirm` is the second typing of it.
export async function validateNewPassword(
  password: string,
  confirm: string,
  context: PasswordContext = {},
  checkBreaches: (password: string) => Promise<boolean | null> = isPasswordBreached
): Promise<string | null> {
  if (!password) return 'Enter a password.'
  if (password !== confirm) return 'The two passwords do not match.'

  const unmet = passwordRequirements.filter((r) => !r.test(password))
  if (unmet.length > 0) {
    return `Your password must ${unmet.map((r) => r.phrase).join(', and ')}.`
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Your password is too long (${PASSWORD_MAX_BYTES} characters at most).`
  }

  const lower = password.toLowerCase()
  const localPart = (context.email ?? '').split('@')[0]?.toLowerCase() ?? ''
  if (localPart.length >= 4 && lower.includes(localPart)) {
    return 'Your password cannot contain your email address.'
  }
  for (const name of context.names ?? []) {
    const n = (name ?? '').trim().toLowerCase()
    if (n.length >= 4 && lower.includes(n)) return 'Your password cannot contain your name.'
  }
  if (isCommonPassword(password)) return 'That password is too common. Please choose a less predictable one.'

  if ((await checkBreaches(password)) === true) {
    return 'That password has appeared in a known data breach. Please choose a different one.'
  }
  return null
}

// A random password nobody ever sees: created for an account whose owner will set
// their own through a link. Guaranteed to satisfy the character-class rules in case
// the Auth project enforces them on createUser.
export function generateUnknownPassword(): string {
  return `${randomBytes(24).toString('base64url')}-Aa9`
}
