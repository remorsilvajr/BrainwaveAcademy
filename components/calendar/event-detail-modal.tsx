'use client'

import type { ReactNode } from 'react'
import { X, MapPin, Clock } from 'lucide-react'
import { formatDateLong } from '@/lib/format'
import { Modal } from '@/components/ui/modal'

export type EventDetail = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  event_type: string
}

const typeBadgeClasses: Record<string, string> = {
  event: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  holiday: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null
  const format = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 === 0 ? 12 : h % 12
    return `${hour}:${String(m).padStart(2, '0')} ${period}`
  }
  return end ? `${format(start)} - ${format(end)}` : format(start)
}

// A shared read-only shell — the actions area (RSVP for a parent, edit/
// delete + headcount for admin) is passed as `children` rather than this
// component branching on role, so each portal's own event-detail wiring
// stays in its own page/component instead of one file knowing about every
// role's needs.
export function EventDetailModal({
  event,
  onClose,
  children,
}: {
  event: EventDetail
  onClose: () => void
  children?: ReactNode
}) {
  const timeRange = formatTimeRange(event.start_time, event.end_time)

  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <div>
          <span
            className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadgeClasses[event.event_type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {event.event_type}
          </span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 p-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDateLong(event.event_date)}</p>
        {timeRange && (
          <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 shrink-0" />
            {timeRange}
          </p>
        )}
        {event.location && (
          <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="h-4 w-4 shrink-0" />
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
        )}
      </div>

      {children && <div className="border-t border-gray-100 dark:border-gray-800 p-6">{children}</div>}
    </Modal>
  )
}
