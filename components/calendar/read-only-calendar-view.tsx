'use client'

import { useState } from 'react'
import { CalendarGrid, type CalendarEvent } from '@/components/calendar/calendar-grid'
import { EventDetailModal, type EventDetail } from '@/components/calendar/event-detail-modal'

// View-only calendar — teacher's own read of the school calendar has no
// RSVP concept (that's parent-only) and no edit/delete (admin-only), so
// this is just CalendarGrid + EventDetailModal wired together with no
// action area passed as children.
export function ReadOnlyCalendarView({ events, monthParam, basePath }: { events: EventDetail[]; monthParam: string; basePath: string }) {
  const [selected, setSelected] = useState<EventDetail | null>(null)

  const gridEvents: CalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    event_date: e.event_date,
    event_type: e.event_type,
  }))

  return (
    <>
      <CalendarGrid
        events={gridEvents}
        monthParam={monthParam}
        basePath={basePath}
        onSelectEvent={(e) => setSelected(events.find((ev) => ev.id === e.id) ?? null)}
      />
      {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
