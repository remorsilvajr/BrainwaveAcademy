'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const RSVP_STATUSES = ['going', 'not_going'] as const

export async function submitRsvp(eventId: string, status: string): Promise<{ error: string } | undefined> {
  if (!(RSVP_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Invalid response.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to RSVP.' }
  }

  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, parent_id: user.id, status, responded_at: new Date().toISOString() },
      { onConflict: 'event_id,parent_id' }
    )
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `RSVP'd "${status === 'going' ? 'Going' : 'Not Going'}" to an event`,
    targetTable: 'event_rsvps',
    targetId: eventId,
  })

  revalidatePath('/parent/calendar')
}
