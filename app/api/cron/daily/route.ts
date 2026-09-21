import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'
import { todayIso } from '@/lib/format'
import { runDailyNotifications } from '@/lib/daily-notifications'

// Called once a day by Vercel Cron (vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when a CRON_SECRET environment variable
// exists, so the secret must be set in the Vercel project. Anything without it
// is refused, and if the variable isn't configured at all the route refuses
// everyone rather than running open. Not a page or a Server Action, so the
// portal middleware doesn't apply; this secret is the only gate.
export const dynamic = 'force-dynamic'

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  }
  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await runDailyNotifications({
    admin: createAdminClient(),
    send: (to, mail) => sendEmail({ to, subject: mail.subject, html: mail.html }),
    today: todayIso(),
    siteUrl: getSiteUrl(),
  })
  return Response.json(summary)
}
