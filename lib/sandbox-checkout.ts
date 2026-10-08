import { todayIso } from '@/lib/format'

// Online payment is a SANDBOX for now: no real money moves and no payment
// provider is called. The outcomes copy Ezypay's published test data
// (developer.ezypay.com/docs/test-payment-data), so switching to a real
// provider later keeps the same test numbers. A real Ezypay sandbox needs
// merchant API credentials the school doesn't have yet.
// Client-safe (no secrets), so the checkout can show the same rules it is held to.

export type OnlineMethod = 'card' | 'gcash'

export const SANDBOX_TEST_CARDS: { number: string; outcome: string; error?: string }[] = [
  { number: '4111111111111111', outcome: 'Payment succeeds' },
  { number: '4556175161745153', outcome: 'Insufficient funds', error: 'The card was declined: insufficient funds.' },
  { number: '5500000000000004', outcome: 'Expired card', error: 'The card was declined: the card has expired.' },
  { number: '4868470817885831', outcome: 'Invalid payment method', error: 'The card was declined: invalid payment method.' },
  { number: '4237990879556339', outcome: 'Contact your bank', error: 'The card was declined. Please contact your bank.' },
]

export const SANDBOX_TEST_GCASH: { number: string; outcome: string; error?: string }[] = [
  { number: '09661645400', outcome: 'Payment succeeds' },
  { number: '09661645401', outcome: 'Payment succeeds' },
  { number: '08774400004', outcome: 'Invalid account details', error: 'GCash could not verify this account. Check the number and try again.' },
  { number: '08774400001', outcome: 'Process expired', error: 'The GCash payment expired before it was completed. Please try again.' },
]

const digits = (value: string) => value.replace(/\D/g, '')

// The standard card-number checksum, so a typo is caught like a real checkout would.
export function passesLuhn(number: string): boolean {
  const d = digits(number)
  if (d.length < 12 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

export function cardBrand(number: string): string {
  const d = digits(number)
  if (d.startsWith('4')) return 'Visa'
  if (/^5[1-5]/.test(d)) return 'Mastercard'
  return 'Card'
}

// "MM/YY", not before this month (Manila).
export function isValidExpiry(value: string, today: string = todayIso()): boolean {
  const m = value.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m) return false
  const month = Number(m[1])
  if (month < 1 || month > 12) return false
  const year = 2000 + Number(m[2])
  const [ty, tm] = today.split('-').map(Number)
  return year > ty || (year === ty && month >= tm)
}

export type SandboxResult = { ok: true; note: string } | { ok: false; error: string }

// What is kept about a successful payment is only the brand and last four
// digits (or the GCash number's last four); a card number is never stored.
export function simulateCardPayment(input: { number: string; expiry: string; cvc: string; name: string }, today?: string): SandboxResult {
  const number = digits(input.number)
  if (!input.name.trim()) return { ok: false, error: 'Enter the name on the card.' }
  if (!passesLuhn(number)) return { ok: false, error: 'Enter a valid card number.' }
  if (!isValidExpiry(input.expiry, today)) return { ok: false, error: 'Enter a valid expiry date (MM/YY).' }
  if (!/^\d{3,4}$/.test(input.cvc.trim())) return { ok: false, error: 'Enter the 3 or 4 digit security code.' }
  const known = SANDBOX_TEST_CARDS.find((c) => c.number === number)
  if (!known) return { ok: false, error: 'This is a test checkout. Use one of the test card numbers shown.' }
  if (known.error) return { ok: false, error: known.error }
  return { ok: true, note: `${cardBrand(number)} ending ${number.slice(-4)}` }
}

export function simulateGcashPayment(input: { mobile: string }): SandboxResult {
  // "+63 966 164 5400", "09661645400" and "9661645400" all mean the same number.
  // (Two of Ezypay's test numbers start 08, which isn't a real mobile prefix,
  // so this checks the shape only.)
  const d = digits(input.mobile)
  const local = d.startsWith('63') ? `0${d.slice(2)}` : d.startsWith('0') ? d : `0${d}`
  if (/[^\d\s+()-]/.test(input.mobile) || !/^0\d{10}$/.test(local)) {
    return { ok: false, error: 'Enter the GCash mobile number.' }
  }
  const known = SANDBOX_TEST_GCASH.find((g) => g.number === local)
  if (!known) return { ok: false, error: 'This is a test checkout. Use one of the test GCash numbers shown.' }
  if (known.error) return { ok: false, error: known.error }
  return { ok: true, note: `GCash ending ${local.slice(-4)}` }
}

export function onlineMethodLabel(method: string | null | undefined): string | null {
  if (method === 'card') return 'Card (online)'
  if (method === 'gcash') return 'GCash (online)'
  return null
}
