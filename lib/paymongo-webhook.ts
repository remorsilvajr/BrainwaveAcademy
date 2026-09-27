import type { SupabaseClient } from '@supabase/supabase-js'
import { emailReceiptFor } from '@/lib/send-receipt'
import { notifyUsers } from '@/lib/notify'
import { logActivity } from '@/lib/activity-log'

// The business logic behind the PayMongo webhook, written against injected
// dependencies (like lib/send-receipt.ts and lib/daily-notifications.ts) so
// a test can call it directly with a fake admin client instead of making a
// real HTTP request to the route handler.
export type PaymongoWebhookDeps = {
  admin: SupabaseClient
  emailReceipt?: typeof emailReceiptFor
  notify?: typeof notifyUsers
}

export type PaymongoWebhookResult =
  // retryable: true means asking PayMongo to redeliver later might actually
  // help (a transient DB error); false means the event itself will never
  // resolve differently (unknown type, malformed metadata, unknown payment
  // id) so retries would just repeat forever — those are logged instead.
  | { handled: false; reason: string; retryable: boolean }
  | { handled: true; duplicate: true }
  | { handled: true; duplicate: false; paymentId: string }

const HANDLED_EVENT_TYPES = new Set(['checkout_session.payment.paid', 'payment.paid'])

// Safely reads a dotted path out of an unknown JSON value without `any`.
function getPath(value: unknown, path: string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

// PayMongo's exact nesting for where a checkout session's metadata ends up
// on the resulting payment event was not confirmed against real docs today
// (see the plan's documentation-gap note) — checked at a few plausible
// paths defensively. Unmatched shapes are logged so the first real test
// delivery shows the actual structure in the logs.
function extractMetadata(event: unknown): { paymentId?: string; parentId?: string } {
  const candidatePaths = [
    ['data', 'attributes', 'data', 'attributes', 'metadata'],
    ['data', 'attributes', 'metadata'],
    ['data', 'attributes', 'data', 'attributes', 'checkout_session', 'metadata'],
  ]
  for (const path of candidatePaths) {
    const candidate = getPath(event, path)
    if (candidate && typeof candidate === 'object') {
      const meta = candidate as Record<string, unknown>
      if (typeof meta.payment_id === 'string') {
        return { paymentId: meta.payment_id, parentId: typeof meta.parent_id === 'string' ? meta.parent_id : undefined }
      }
    }
  }
  return {}
}

export async function handlePaymongoEvent(deps: PaymongoWebhookDeps, event: unknown): Promise<PaymongoWebhookResult> {
  const { admin, emailReceipt = emailReceiptFor, notify = notifyUsers } = deps

  const eventType = getPath(event, ['data', 'attributes', 'type'])
  if (typeof eventType !== 'string' || !HANDLED_EVENT_TYPES.has(eventType)) {
    return { handled: false, reason: `ignored event type: ${String(eventType)}`, retryable: false }
  }

  const { paymentId, parentId } = extractMetadata(event)
  if (!paymentId || !parentId) {
    console.error('paymongo webhook: could not find payment_id/parent_id in metadata', JSON.stringify(event))
    return { handled: false, reason: 'missing metadata.payment_id or metadata.parent_id', retryable: false }
  }

  const { data: payment } = await admin.from('payments').select('id, status').eq('id', paymentId).maybeSingle()
  if (!payment) {
    console.error('paymongo webhook: payment not found', paymentId)
    return { handled: false, reason: 'payment not found', retryable: false }
  }
  if (payment.status !== 'pending') {
    // Already processed by an earlier delivery of the same event (PayMongo
    // retries webhooks that don't return 2xx). Idempotent no-op, not an error.
    return { handled: true, duplicate: true }
  }

  const { error: updateError } = await admin
    .from('payments')
    .update({ status: 'paid', payment_method: 'paymongo', transaction_date: new Date().toISOString(), recorded_by: parentId })
    .eq('id', paymentId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('paymongo webhook: failed to mark payment paid', updateError.message)
    return { handled: false, reason: updateError.message, retryable: true }
  }

  await admin
    .from('payment_gateway_sessions')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('payment_id', paymentId)

  await logActivity(admin, {
    actorId: parentId,
    action: 'Paid a fee via PayMongo (test mode)',
    targetTable: 'payments',
    targetId: paymentId,
  })

  await emailReceipt(paymentId)

  await notify([parentId], {
    kind: 'money',
    title: 'Payment received',
    body: 'Your online payment was received and the fee is now marked paid.',
    href: '/parent/payments',
  })

  return { handled: true, duplicate: false, paymentId }
}
