'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const EVENT_TYPES = ['event', 'holiday'] as const

export type EventInput = {
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  eventType: string
}

function validate(input: EventInput): string | null {
  if (!input.title.trim()) return 'Enter a title for this event.'
  if (!input.eventDate) return 'Choose a date for this event.'
  if (!(EVENT_TYPES as readonly string[]).includes(input.eventType)) return 'Choose a valid event type.'
  return null
}

export async function createEvent(input: EventInput): Promise<{ error: string } | { id: string }> {
  const validationError = validate(input)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      location: input.location.trim() || null,
      event_type: input.eventType,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Created event: ${input.title.trim()}`,
    targetTable: 'events',
    targetId: data.id,
  })

  revalidatePath('/admin/calendar')
  revalidatePath('/teacher/calendar')
  revalidatePath('/parent/calendar')
  return { id: data.id }
}

export async function updateEvent(eventId: string, input: EventInput): Promise<{ error: string } | undefined> {
  const validationError = validate(input)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('events')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      location: input.location.trim() || null,
      event_type: input.eventType,
    })
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Updated event: ${input.title.trim()}`,
    targetTable: 'events',
    targetId: eventId,
  })

  revalidatePath('/admin/calendar')
  revalidatePath('/teacher/calendar')
  revalidatePath('/parent/calendar')
}

export async function deleteEvent(eventId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle()

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: `Deleted event: ${existing?.title ?? ''}`.trim(),
    targetTable: 'events',
    targetId: eventId,
  })

  revalidatePath('/admin/calendar')
  revalidatePath('/teacher/calendar')
  revalidatePath('/parent/calendar')
}
