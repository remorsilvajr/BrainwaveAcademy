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
