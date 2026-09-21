// The password rules a form can show live. Plain data, no Node imports, so a client
// component may import it; lib/password.ts is the server side that enforces them.

export const PASSWORD_MIN_LENGTH = 8
// bcrypt ignores everything past 72 bytes, so a longer "password" would silently be
// a shorter one. Reject it instead.
export const PASSWORD_MAX_BYTES = 72

export const passwordRequirements = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters long`,
    phrase: `be at least ${PASSWORD_MIN_LENGTH} characters long`,
    test: (p: string) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'Includes at least one uppercase letter',
    phrase: 'include an uppercase letter',
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: 'special',
    label: 'Includes at least one number or special character',
    phrase: 'include a number or special character',
    test: (p: string) => /[\d\W_]/.test(p),
  },
] as const
