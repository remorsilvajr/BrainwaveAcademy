import { createClient } from '@/lib/supabase/server'
import { monthFromParam } from '@/lib/date-params'
import { ParentCalendarView } from '@/components/parent/parent-calendar-view'

export default async function ParentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = monthFromParam(monthParam)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rangeStart = `${month}-01`
  const [year, mo] = month.split('-').map(Number)
  const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

  const [{ data: events }, { data: rsvps }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, description, event_date, start_time, end_time, location, event_type')
      .gte('event_date', rangeStart)
      .lt('event_date', nextMonth)
      .order('event_date', { ascending: true }),
    supabase.from('event_rsvps').select('event_id, status').eq('parent_id', user?.id ?? ''),
  ])

  const rsvpByEventId = new Map((rsvps ?? []).map((r) => [r.event_id, r.status]))
  const eventsWithRsvp = (events ?? []).map((e) => ({ ...e, rsvpStatus: rsvpByEventId.get(e.id) ?? null }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">School Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upcoming holidays and events. Tap an event to see details or RSVP.
        </p>
      </div>

      <ParentCalendarView events={eventsWithRsvp} monthParam={month} />
    </div>
  )
}
