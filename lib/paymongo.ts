import { createHmac, timingSafeEqual } from 'node:crypto'
import { roundToCents } from '@/lib/format'

// PayMongo test-mode integration. Mirrors lib/password.ts's isPasswordBreached
// shape: plain fetch with an injectable fetchImpl default param, an explicit
// timeout, and a return-based error instead of a throw, so a Server Action
// calling this can show the caller a message rather than a generic failure.
//
// Test mode only: this project's instructor requirement is "no real
// payment gateway"; a sandbox key (sk_test_...) never moves real money, and
// this app never sends a live-mode key anywhere. See CLAUDE.md.

export type CreateCheckoutSessionParams = {
  amount: number // pesos, e.g. 4200.00 — converted to centavos below
  description: string
  referenceNumber: string
  successUrl: string
  cancelUrl: string
  metadata: Record<string, string>
}

export type CheckoutSessionResult = { id: string; checkoutUrl: string } | { error: string }

export async function createCheckoutSession(
  secretKey: string,
  params: CreateCheckoutSessionParams,
  fetchImpl: typeof fetch = fetch
): Promise<CheckoutSessionResult> {
  try {
    const amountCentavos = Math.round(roundToCents(params.amount) * 100)
    const response = await fetchImpl('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                name: params.description,
                amount: amountCentavos,
                currency: 'PHP',
                quantity: 1,
              },
            ],
            payment_method_types: ['gcash', 'card', 'grab_pay'],
            description: params.description,
            reference_number: params.referenceNumber,
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            metadata: params.metadata,
            send_email_receipt: false,
            show_line_items: true,
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    })

    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.data?.attributes?.checkout_url) {
      const message = body?.errors?.[0]?.detail ?? `PayMongo returned ${response.status}.`
      return { error: message }
    }
    return { id: body.data.id, checkoutUrl: body.data.attributes.checkout_url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not reach PayMongo.' }
  }
}

// PayMongo signs each webhook with the endpoint's own signing secret (shown
// once in the PayMongo dashboard when the webhook is created) and sends it
// as `Paymongo-Signature: t=<unix_ts>,te=<test_signature>,li=<live_signature>`.
// The signed string is `${t}.${rawBody}`, HMAC-SHA256, hex-encoded. This
// project is test-mode only, so only `te` is ever checked.
//
// Must run against the *raw* request body (before any JSON.parse), same
// requirement PayMongo documents and the same reason the route handler
// below calls request.text() rather than request.json().
export function verifyPaymongoSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = new Map<string, string>()
  for (const segment of signatureHeader.split(',')) {
    const [key, value] = segment.split('=')
    if (key && value) parts.set(key.trim(), value.trim())
  }
  const timestamp = parts.get('t')
  const testSignature = parts.get('te')
  if (!timestamp || !testSignature) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const givenBuf = Buffer.from(testSignature)
  return expectedBuf.length === givenBuf.length && timingSafeEqual(expectedBuf, givenBuf)
}
