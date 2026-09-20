import { createClient } from '@/lib/supabase/server'
import { todayIso } from '@/lib/format'
import { AdminCalendarView } from '@/components/admin/admin-calendar-view'

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? todayIso().slice(0, 7)
  const supabase = await createClient()

  const rangeStart = `${month}-01`
  const [year, mo] = month.split('-').map(Number)
  const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, event_date, start_time, end_time, location, event_type')
    .gte('event_date', rangeStart)
    .lt('event_date', nextMonth)
    .order('event_date', { ascending: true })

  const eventIds = (events ?? []).map((e) => e.id)
  const { data: rsvps } =
    eventIds.length > 0
      ? await supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds)
      : { data: [] }

  const countsByEvent = new Map<string, { going: number; notGoing: number }>()
  for (const r of rsvps ?? []) {
    const counts = countsByEvent.get(r.event_id) ?? { going: 0, notGoing: 0 }
    if (r.status === 'going') counts.going += 1
    else counts.notGoing += 1
    countsByEvent.set(r.event_id, counts)
  }

  const eventsWithCounts = (events ?? []).map((e) => ({
    ...e,
    going: countsByEvent.get(e.id)?.going ?? 0,
    notGoing: countsByEvent.get(e.id)?.notGoing ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">School Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create and publish holidays and events. Tap an event to see RSVP headcounts.
        </p>
      </div>

      <AdminCalendarView events={eventsWithCounts} monthParam={month} />
    </div>
  )
}
