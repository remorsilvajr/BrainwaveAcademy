import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaymongoSignature } from '@/lib/paymongo'
import { handlePaymongoEvent } from '@/lib/paymongo-webhook'

// PayMongo (test mode) calls this whenever a Checkout Session's payment
// succeeds. Not a page or a Server Action, so the portal middleware doesn't
// apply here either (same note as app/api/cron/daily/route.ts) — the
// signature check is the only gate, and it must run before the body is
// parsed as JSON, on the exact raw bytes PayMongo signed.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'PAYMONGO_WEBHOOK_SECRET is not configured.' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('paymongo-signature')
  if (!signatureHeader || !verifyPaymongoSignature(rawBody, signatureHeader, secret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await handlePaymongoEvent({ admin: createAdminClient() }, event)
  // 200 once the signature checks out, for a success, a duplicate delivery,
  // or a failure retrying won't fix (unknown event type, bad metadata, no
  // such payment) — those are logged, not retried forever. Only a
  // genuinely transient failure (e.g. a DB blip) asks PayMongo to redeliver.
  const status = !result.handled && result.retryable ? 500 : 200
  return Response.json(result, { status })
}
