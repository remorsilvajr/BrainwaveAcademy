import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import {
  generateUnknownPassword,
  isCommonPassword,
  isPasswordBreached,
  passwordRequirements,
  validateNewPassword,
} from '@/lib/password'

const notBreached = async () => false

describe('validateNewPassword', () => {
  it('accepts a normal strong password', async () => {
    expect(await validateNewPassword('Maple-River-2049', 'Maple-River-2049', {}, notBreached)).toBeNull()
  })

  it('needs both typings to match', async () => {
    expect(await validateNewPassword('Maple-River-2049', 'Maple-River-2050', {}, notBreached)).toBe('The two passwords do not match.')
  })

  it('reports each unmet rule in plain words', async () => {
    const message = await validateNewPassword('abc', 'abc', {}, notBreached)
    expect(message).toContain('at least 8 characters')
    expect(message).toContain('uppercase letter')
    expect(message).toContain('number or special character')
    expect(await validateNewPassword('alllowercase1', 'alllowercase1', {}, notBreached)).toContain('uppercase letter')
  })

  it('rejects a password over the 72-byte limit bcrypt can use', async () => {
    const long = `A1${'x'.repeat(80)}`
    expect(await validateNewPassword(long, long, {}, notBreached)).toContain('too long')
    const emojiHeavy = `A1${'😀'.repeat(20)}` // few characters, more than 72 bytes
    expect(await validateNewPassword(emojiHeavy, emojiHeavy, {}, notBreached)).toContain('too long')
  })

  it('rejects a password that contains the email address or name', async () => {
    const context = { email: 'maria.santos@example.com', names: ['Maria', 'Santos'] }
    expect(await validateNewPassword('Xmaria.santosX9', 'Xmaria.santosX9', context, notBreached)).toContain('email')
    expect(await validateNewPassword('Santos-Rocks-77', 'Santos-Rocks-77', context, notBreached)).toContain('name')
    // short names are ignored so a two-letter name does not ban half the alphabet
    expect(await validateNewPassword('Blue-Sky-Rain-77', 'Blue-Sky-Rain-77', { names: ['Al'] }, notBreached)).toBeNull()
  })

  it('rejects common passwords and simple variations of them', async () => {
    for (const bad of ['Password1', 'P@ssw0rd', 'Qwerty123', 'Brainwave2026']) {
      expect(await validateNewPassword(bad, bad, {}, notBreached), bad).toContain('too common')
    }
  })

  it('rejects a password found in a breach, and allows it when the check is unavailable', async () => {
    expect(await validateNewPassword('Maple-River-2049', 'Maple-River-2049', {}, async () => true)).toContain('data breach')
    expect(await validateNewPassword('Maple-River-2049', 'Maple-River-2049', {}, async () => null)).toBeNull()
  })

  it('never puts the password in the message', async () => {
    const secret = 'Zx9-secret-Value'
    const messages = [
      await validateNewPassword(secret, secret + 'x', {}, notBreached),
      await validateNewPassword(secret, secret, {}, async () => true),
    ]
    for (const m of messages) expect(m).not.toContain(secret)
  })
})

describe('isCommonPassword', () => {
  it('is case-insensitive and ignores trailing digits', () => {
    expect(isCommonPassword('PASSWORD')).toBe(true)
    expect(isCommonPassword('password99')).toBe(true)
    expect(isCommonPassword('Maple-River-2049')).toBe(false)
  })
})

describe('isPasswordBreached', () => {
  const sha1 = (value: string) => createHash('sha1').update(value).digest('hex').toUpperCase()

  it('sends only the first 5 characters of the SHA-1 hash, never the password', async () => {
    const password = 'Some-Password-123'
    const hash = sha1(password)
    const fetchMock = vi.fn(async () => new Response(`${hash.slice(5)}:42\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`))
    const result = await isPasswordBreached(password, fetchMock as unknown as typeof fetch)
    expect(result).toBe(true)
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`)
    expect(calls[0][0]).not.toContain(password)
    expect(calls[0][0]).not.toContain(hash.slice(5))
  })

  it('treats a padded zero-count entry as not breached', async () => {
    const password = 'Another-Password-9'
    const fetchMock = vi.fn(async () => new Response(`${sha1(password).slice(5)}:0`))
    expect(await isPasswordBreached(password, fetchMock as unknown as typeof fetch)).toBe(false)
  })

  it('returns null (unknown) when the service fails or errors', async () => {
    expect(await isPasswordBreached('x', (async () => new Response('', { status: 503 })) as unknown as typeof fetch)).toBeNull()
    expect(await isPasswordBreached('x', (async () => { throw new Error('offline') }) as unknown as typeof fetch)).toBeNull()
  })
})

describe('generateUnknownPassword', () => {
  it('is random, long, and satisfies every character rule', () => {
    const a = generateUnknownPassword()
    const b = generateUnknownPassword()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(30)
    expect(passwordRequirements.every((r) => r.test(a))).toBe(true)
  })
})
