'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarGrid, type CalendarEvent } from '@/components/calendar/calendar-grid'
import { EventDetailModal, type EventDetail } from '@/components/calendar/event-detail-modal'
import { submitRsvp } from '@/app/parent/calendar/actions'

type ParentEvent = EventDetail & { rsvpStatus: string | null }

export function ParentCalendarView({ events, monthParam }: { events: ParentEvent[]; monthParam: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ParentEvent | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const gridEvents: CalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    event_date: e.event_date,
    event_type: e.event_type,
  }))

  async function handleRsvp(status: 'going' | 'not_going') {
    if (!selected) return
    setIsSubmitting(true)
    setError('')
    try {
      const result = await submitRsvp(selected.id, status)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSelected({ ...selected, rsvpStatus: status })
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <CalendarGrid
        events={gridEvents}
        monthParam={monthParam}
        basePath="/parent/calendar"
        onSelectEvent={(e) => setSelected(events.find((ev) => ev.id === e.id) ?? null)}
      />

      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)}>
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Will you be attending?</p>
          {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRsvp('going')}
              disabled={isSubmitting}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                selected.rsvpStatus === 'going'
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Going
            </button>
            <button
              type="button"
              onClick={() => handleRsvp('not_going')}
              disabled={isSubmitting}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                selected.rsvpStatus === 'not_going'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Not Going
            </button>
          </div>
        </EventDetailModal>
      )}
    </>
  )
}
