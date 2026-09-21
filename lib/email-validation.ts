// One shared email check for every form that accepts an address (public
// /enroll, admin Create New Account). It used to be a copy-pasted
// /^[^\s@]+@[^\s@]+\.[^\s@]+$/ in two places, which let through things like
// "a@b..c" and "a@b.c" and had no length limit.
//
// Deliberately not the full RFC 5322 grammar: a practical subset (dot-atom
// local part, DNS-style domain with a 2+ letter TLD) that rejects the common
// typo shapes without refusing real addresses. Supabase Auth has the last word
// on deliverability.
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/
const TLD = /^[A-Za-z]{2,}$/

export const EMAIL_VALIDATION_MESSAGE = 'Please enter a valid email address.'

// Lowercased and trimmed the same way profiles.email is stored everywhere.
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  if (email.length === 0 || email.length > 254) return false

  const at = email.lastIndexOf('@')
  if (at < 1 || email.indexOf('@') !== at) return false // exactly one "@", with a local part

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (local.length > 64 || !LOCAL_PART.test(local)) return false

  const labels = domain.split('.')
  if (labels.length < 2) return false
  if (!labels.every((label) => label.length >= 1 && label.length <= 63 && DOMAIN_LABEL.test(label))) return false
  return TLD.test(labels[labels.length - 1])
}
