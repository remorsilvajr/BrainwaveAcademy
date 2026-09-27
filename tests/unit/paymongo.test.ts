import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPaymongoSignature } from '@/lib/paymongo'

const SECRET = 'whsk_test_abc123'

function sign(timestamp: string, body: string, secret: string = SECRET) {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},te=${digest},li=live_signature_not_used_in_tests`
}

describe('verifyPaymongoSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ data: { attributes: { type: 'payment.paid' } } })
    const header = sign('1700000000', body)
    expect(verifyPaymongoSignature(body, header, SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ data: { attributes: { type: 'payment.paid' } } })
    const header = sign('1700000000', body)
    const tampered = JSON.stringify({ data: { attributes: { type: 'payment.failed' } } })
    expect(verifyPaymongoSignature(tampered, header, SECRET)).toBe(false)
  })

  it('rejects a signature made with the wrong secret', () => {
    const body = JSON.stringify({ ok: true })
    const header = sign('1700000000', body, 'a-different-secret')
    expect(verifyPaymongoSignature(body, header, SECRET)).toBe(false)
  })

  it('rejects a malformed header with no te= part', () => {
    const body = JSON.stringify({ ok: true })
    expect(verifyPaymongoSignature(body, 't=1700000000', SECRET)).toBe(false)
    expect(verifyPaymongoSignature(body, '', SECRET)).toBe(false)
  })

  it('rejects a signature for a different timestamp than the one claimed', () => {
    const body = JSON.stringify({ ok: true })
    const digestForOtherTimestamp = createHmac('sha256', SECRET).update(`1600000000.${body}`).digest('hex')
    const header = `t=1700000000,te=${digestForOtherTimestamp}`
    expect(verifyPaymongoSignature(body, header, SECRET)).toBe(false)
  })
})
