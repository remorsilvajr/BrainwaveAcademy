'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { CalendarGrid, type CalendarEvent } from '@/components/calendar/calendar-grid'
import { EventDetailModal, type EventDetail } from '@/components/calendar/event-detail-modal'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createEvent, updateEvent, deleteEvent, type EventInput } from '@/app/admin/calendar/actions'

type AdminEvent = EventDetail & { going: number; notGoing: number }

const emptyInput: EventInput = {
  title: '',
  description: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  location: '',
  eventType: 'event',
}

function EventFormModal({
  editing,
  defaultDate,
  onClose,
}: {
  editing: AdminEvent | null
  defaultDate: string
  onClose: () => void
}) {
  const router = useRouter()
  const [input, setInput] = useState<EventInput>(
    editing
      ? {
          title: editing.title,
          description: editing.description ?? '',
          eventDate: editing.event_date,
          startTime: editing.start_time ?? '',
          endTime: editing.end_time ?? '',
          location: editing.location ?? '',
          eventType: editing.event_type,
        }
      : { ...emptyInput, eventDate: defaultDate }
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setIsSaving(true)
    setError('')
    try {
      const result = editing ? await updateEvent(editing.id, input) : await createEvent(input)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Event' : 'New Event'}</h2>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 p-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Title</label>
          <input
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Description</label>
          <textarea
            value={input.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Date</label>
            <input
              type="date"
              value={input.eventDate}
              onChange={(e) => setInput({ ...input, eventDate: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Type</label>
            <select
              value={input.eventType}
              onChange={(e) => setInput({ ...input, eventType: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            >
              <option value="event">Event</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Start Time (optional)</label>
            <input
              type="time"
              value={input.startTime}
              onChange={(e) => setInput({ ...input, startTime: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">End Time (optional)</label>
            <input
              type="time"
              value={input.endTime}
              onChange={(e) => setInput({ ...input, endTime: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Location (optional)</label>
          <input
            value={input.location}
            onChange={(e) => setInput({ ...input, location: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving || !input.title.trim() || !input.eventDate}
          className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Event'}
        </button>
      </div>
    </Modal>
  )
}

export function AdminCalendarView({ events, monthParam }: { events: AdminEvent[]; monthParam: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<AdminEvent | null>(null)
  const [formState, setFormState] = useState<{ editing: AdminEvent | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminEvent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const gridEvents: CalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    event_date: e.event_date,
    event_type: e.event_type,
  }))

  async function handleDelete() {
    if (!confirmDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const result = await deleteEvent(confirmDelete.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setConfirmDelete(null)
      setSelected(null)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setFormState({ editing: null })}
          className="flex items-center gap-1.5 rounded-full bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d]"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <CalendarGrid
        events={gridEvents}
        monthParam={monthParam}
        basePath="/admin/calendar"
        onSelectEvent={(e) => setSelected(events.find((ev) => ev.id === e.id) ?? null)}
      />

      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)}>
          <div className="mb-3 flex items-center gap-4 text-sm">
            <span className="font-semibold text-green-700 dark:text-green-400">{selected.going} Going</span>
            <span className="font-semibold text-gray-500 dark:text-gray-400">{selected.notGoing} Not Going</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormState({ editing: selected })
                setSelected(null)
              }}
              className="flex-1 rounded-lg border border-[#0b1b62] dark:border-indigo-300 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(selected)}
              className="flex-1 rounded-lg border border-red-300 dark:border-red-800 py-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </div>
        </EventDetailModal>
      )}

      {formState && (
        <EventFormModal
          editing={formState.editing}
          defaultDate={`${monthParam}-01`}
          onClose={() => setFormState(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this event?"
          description={`"${confirmDelete.title}" will be removed from the calendar for everyone.`}
          confirmLabel="Yes, Delete"
          tone="danger"
          isPending={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
