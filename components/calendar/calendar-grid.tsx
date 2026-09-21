'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayIso } from '@/lib/format'

export type CalendarEvent = { id: string; title: string; event_date: string; event_type: string }

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Pure calendar-math helpers, deliberately built on Date.UTC rather than a
// local `new Date(y, m, d)` — the latter resolves against the runtime's
// local timezone (see the todayIso()/isToday() note in lib/format.ts for
// the same class of bug this avoids), which could shift which weekday a
// date lands on depending on where this process happens to run.
function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}
function firstWeekday(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
}
function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}
function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

const eventTypeDot: Record<string, string> = {
  event: 'bg-[#00a3e0]',
  holiday: 'bg-[#e6007e]',
}

export function CalendarGrid({
  events,
  monthParam,
  basePath,
  onSelectEvent,
}: {
  events: CalendarEvent[]
  // "YYYY-MM" — lives in the URL (same convention as DateSelector's `date`
  // query param) so the visible month survives a refresh and is linkable.
  monthParam: string
  basePath: string
  onSelectEvent: (event: CalendarEvent) => void
}) {
  const router = useRouter()
  const [yearStr, monthStr] = monthParam.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const today = todayIso()

  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = eventsByDate.get(e.event_date) ?? []
    list.push(e)
    eventsByDate.set(e.event_date, list)
  }

  const monthPrefix = `${year}-${pad(month)}-`
  const monthEvents = events
    .filter((e) => e.event_date.startsWith(monthPrefix))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const leading = firstWeekday(year, month)
  const total = daysInMonth(year, month)
  const cellCount = Math.ceil((leading + total) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, i) => {
    const day = i - leading + 1
    return day >= 1 && day <= total ? day : null
  })

  function goToMonth(delta: number) {
    const next = addMonths(year, month, delta)
    router.push(`${basePath}?month=${next.year}-${pad(next.month)}`)
  }

  function goTo(nextYear: number, nextMonth: number) {
    router.push(`${basePath}?month=${nextYear}-${pad(nextMonth)}`)
  }

  // Current year + next year, per the "current and next year" ask — but if
  // the visible month (e.g. reached via the prev/next arrows, or a linked
  // URL) falls outside that pair, it's added too so the Year select never
  // silently shows a value that doesn't match what's actually on screen.
  const thisYear = Number(today.slice(0, 4))
  const yearOptions = Array.from(new Set([thisYear, thisYear + 1, year])).sort((a, b) => a - b)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => goTo(year, Number(e.target.value))}
            aria-label="Month"
            className="rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-2 py-1.5 text-sm font-semibold focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => goTo(Number(e.target.value), month)}
            aria-label="Year"
            className="rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-2 py-1.5 text-sm font-semibold focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[72px] sm:min-h-[88px]" />
          const iso = toIso(year, month, day)
          const dayEvents = eventsByDate.get(iso) ?? []
          const isToday = iso === today
          return (
            <div
              key={i}
              className={`min-h-[72px] rounded-lg border p-1 sm:min-h-[88px] ${
                isToday
                  ? 'border-[#0b1b62] dark:border-indigo-400 bg-[#0b1b62]/5 dark:bg-indigo-400/10'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <p className={`text-xs font-medium ${isToday ? 'text-[#0b1b62] dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {day}
              </p>
              {/* On a phone the cells are too narrow for a title, so an event is
                  just a dot here (the list under the grid names it); from `sm`
                  up it is the usual labelled chip. */}
              <div className="mt-1 flex flex-wrap gap-0.5 sm:block sm:space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEvent(e)}
                    aria-label={e.title}
                    className="flex items-center gap-1 rounded p-0.5 text-left text-[10px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 sm:w-full sm:px-1 sm:py-0.5"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full sm:h-1.5 sm:w-1.5 ${eventTypeDot[e.event_type] ?? 'bg-gray-400'}`} />
                    <span className="hidden truncate sm:block">{e.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-gray-400 dark:text-gray-500">
                    +{dayEvents.length - 3}
                    <span className="hidden sm:inline"> more</span>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {monthEvents.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800 sm:hidden">
          {monthEvents.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(e)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventTypeDot[e.event_type] ?? 'bg-gray-400'}`} />
                <span className="w-14 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {MONTH_NAMES[month - 1].slice(0, 3)} {Number(e.event_date.slice(8, 10))}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{e.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
