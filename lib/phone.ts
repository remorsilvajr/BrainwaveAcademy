export function isValidPhilippineMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return /^9\d{9}$/.test(digits) || /^09\d{9}$/.test(digits) || /^639\d{9}$/.test(digits)
}

export function normalizePhilippineMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('63')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits
  return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

export const PHONE_VALIDATION_MESSAGE = 'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'

// isValidPhilippineMobile strips every non-digit before matching, so on its own
// "0917abc1234567" passes. This also rejects any character that isn't a digit,
// space, "+", "-" or parentheses, for user-typed contact numbers.
export function isValidPhoneInput(raw: string) {
  return /^[0-9\s+()-]+$/.test(raw) && isValidPhilippineMobile(raw)
}

// ---------------------------------------------------------------------------
// As-you-type help for PhoneInput (components/ui/phone-input.tsx). A PH mobile
// number is always 10 digits after its prefix ("0", "+63" or none), so that is
// what the counter counts, whichever way the person types it.

export const MOBILE_LOCAL_DIGITS = 10

export type PhoneParts = { prefix: '0' | '+63' | ''; local: string }

export function splitPhone(raw: string): PhoneParts {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+') || digits.startsWith('63')) return { prefix: '+63', local: digits.startsWith('63') ? digits.slice(2) : '' }
  if (digits.startsWith('0')) return { prefix: '0', local: digits.slice(1) }
  return { prefix: '', local: digits }
}

const groupLocal = (local: string) => [local.slice(0, 3), local.slice(3, 6), local.slice(6, 10)].filter(Boolean).join(' ')

// What the field shows while typing: digits grouped "0917 123 4567" /
// "+63 917 123 4567" / "917 123 4567", never more than 10 digits after the
// prefix. A half-typed "+" or "+6" is left alone so it can become "+63".
export function formatPhoneAsTyped(raw: string): string {
  const trimmed = raw.replace(/^\s+/, '')
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+') || (digits.startsWith('6') && digits.length <= 2) || digits.startsWith('63')) {
    if (digits.length === 0) return trimmed.startsWith('+') ? '+' : ''
    if (digits.length < 2 || !digits.startsWith('63')) return `${trimmed.startsWith('+') ? '+' : ''}${digits.slice(0, 2)}`
    const local = digits.slice(2, 2 + MOBILE_LOCAL_DIGITS)
    return local ? `+63 ${groupLocal(local)}` : '+63'
  }
  if (digits.startsWith('0')) {
    const local = digits.slice(1, 1 + MOBILE_LOCAL_DIGITS)
    return local ? `0${local.slice(0, 3)}${local.length > 3 ? ` ${local.slice(3, 6)}` : ''}${local.length > 6 ? ` ${local.slice(6, 10)}` : ''}` : '0'
  }
  return groupLocal(digits.slice(0, MOBILE_LOCAL_DIGITS))
}

// A clinic or hospital number may be a landline ("(084) 123 4567", "8123 4567"):
// 7 to 11 digits, only digits / spaces / + - ( ). A mobile is accepted too.
export function isValidContactNumber(raw: string) {
  if (isValidPhoneInput(raw)) return true
  const digits = raw.replace(/\D/g, '')
  return /^[0-9\s+()-]+$/.test(raw) && digits.length >= 7 && digits.length <= 11
}

export const CONTACT_NUMBER_MESSAGE = 'Enter a valid mobile or landline number, e.g. 0917 123 4567 or (084) 123 4567.'
