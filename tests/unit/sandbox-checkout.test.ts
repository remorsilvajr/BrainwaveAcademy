import { describe, expect, it } from 'vitest'
import { isValidExpiry, passesLuhn, simulateCardPayment, simulateGcashPayment } from '@/lib/sandbox-checkout'

const card = (number: string, extra: Partial<{ expiry: string; cvc: string; name: string }> = {}) =>
  simulateCardPayment({ number, expiry: '12/30', cvc: '123', name: 'Ana Cruz', ...extra }, '2026-09-21')

describe('sandbox card checkout (Ezypay test cards)', () => {
  it('the success card pays and keeps only the brand and last four', () => {
    expect(card('4111 1111 1111 1111')).toEqual({ ok: true, note: 'Visa ending 1111' })
  })
  it('each decline card fails with its own reason', () => {
    expect(card('4556175161745153')).toMatchObject({ ok: false, error: expect.stringContaining('insufficient funds') })
    expect(card('5500000000000004')).toMatchObject({ ok: false, error: expect.stringContaining('expired') })
    expect(card('4868470817885831')).toMatchObject({ ok: false, error: expect.stringContaining('invalid payment method') })
    expect(card('4237990879556339')).toMatchObject({ ok: false, error: expect.stringContaining('contact your bank') })
  })
  it('a real-looking card that is not a test card is refused (nothing real is charged)', () => {
    expect(card('4012888888881881')).toMatchObject({ ok: false, error: expect.stringContaining('test card') })
  })
  it('checks the number, expiry, code and name like a real checkout', () => {
    expect(card('4111111111111112').ok).toBe(false)
    expect(card('4111111111111111', { expiry: '08/26' }).ok).toBe(false)
    expect(card('4111111111111111', { expiry: '13/27' }).ok).toBe(false)
    expect(card('4111111111111111', { cvc: '12' }).ok).toBe(false)
    expect(card('4111111111111111', { name: ' ' }).ok).toBe(false)
  })
  it('expiry is this month or later, Manila time', () => {
    expect(isValidExpiry('09/26', '2026-09-21')).toBe(true)
    expect(isValidExpiry('08/26', '2026-09-21')).toBe(false)
    expect(passesLuhn('4111111111111111')).toBe(true)
  })
})

describe('sandbox GCash checkout (Ezypay test numbers)', () => {
  it('accepts the success numbers in any common format', () => {
    expect(simulateGcashPayment({ mobile: '+63 966 164 5400' })).toEqual({ ok: true, note: 'GCash ending 5400' })
    expect(simulateGcashPayment({ mobile: '09661645401' })).toEqual({ ok: true, note: 'GCash ending 5401' })
  })
  it('fails the failure numbers and anything else', () => {
    expect(simulateGcashPayment({ mobile: '+63 877 440 0004' }).ok).toBe(false)
    expect(simulateGcashPayment({ mobile: '08774400001' }).ok).toBe(false)
    expect(simulateGcashPayment({ mobile: '09171234567' })).toMatchObject({ ok: false, error: expect.stringContaining('test GCash') })
    expect(simulateGcashPayment({ mobile: 'abc' }).ok).toBe(false)
  })
})
