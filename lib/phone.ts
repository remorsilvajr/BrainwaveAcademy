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
