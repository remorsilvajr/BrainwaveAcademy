import { createClient } from '@/lib/supabase/server'
import { todayIso } from '@/lib/format'
import { ReadOnlyCalendarView } from '@/components/calendar/read-only-calendar-view'

export default async function TeacherCalendarPage({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">School Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upcoming holidays and events.</p>
      </div>

      <ReadOnlyCalendarView events={events ?? []} monthParam={month} basePath="/teacher/calendar" />
    </div>
  )
}
