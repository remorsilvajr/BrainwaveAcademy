'use client'

import { useState } from 'react'

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

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function parseIsoDate(value?: string): { day: string; month: string; year: string } {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return { day, month, year }
  }
  return { day: '', month: '', year: '' }
}

// Day/Month/Year dropdowns that compose into the same "YYYY-MM-DD" string a
// native <input type="date"> would produce. Two calling conventions, picked
// per site's existing form pattern rather than forcing one shape everywhere:
// - `name` set (no FormData change needed): renders a hidden input carrying
//   the combined value, so `formData.get(name)` on the existing Server
//   Action keeps working unchanged (see components/enroll/enrollment-form.tsx).
// - `onChange` used without relying on `name`: fires the combined ISO string
//   on every change, for call sites that hold `dob` in local state and pass
//   it directly into a bound Server Action call (the admin slideovers, both
//   roles' My Profile forms) — swap `onChange={setDob}` in for the old
//   `onChange={(e) => setDob(e.target.value)}`.
//
// `defaultValue` seeds the three selects once on mount, deliberately not
// re-synced on every prop change — this project's own convention already
// warns that a <select>'s `defaultValue` re-applies on every re-render
// (unlike <input>, where it only applies once), which snaps a dropdown back
// to blank the instant unrelated state changes elsewhere on the page. These
// three selects are genuinely controlled (`value`/`onChange`), just seeded
// from an internal `useState` initializer rather than the live prop, which
// sidesteps that bug the same way an uncontrolled <input defaultValue> does.
export function DobSelect({
  label,
  name,
  required,
  defaultValue,
  error,
  min,
  max,
  onChange,
}: {
  label: string
  name?: string
  required?: boolean
  defaultValue?: string
  error?: string
  // ISO "YYYY-MM-DD" bounds: min is the earliest selectable (oldest) date,
  // max is the latest selectable (youngest) date — same convention as
  // lib/dob.ts's dobInputMin/dobInputMax, which callers already compute.
  min: string
  max: string
  onChange?: (value: string) => void
}) {
  const initial = parseIsoDate(defaultValue)
  const [day, setDay] = useState(initial.day)
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const minYear = Number(min.slice(0, 4))
  const maxYear = Number(max.slice(0, 4))
  const years: number[] = []
  for (let y = maxYear; y >= minYear; y--) years.push(y)

  // Most recent years first — picking a birth year is far more often a
  // "scroll a little from today" task than a "scroll to the very oldest
  // option" one.
  const dayCount = month && year ? daysInMonth(Number(month), Number(year)) : 31
  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  function composeAndEmit(nextDay: string, nextMonth: string, nextYear: string) {
    const value = nextDay && nextMonth && nextYear ? `${nextYear}-${nextMonth}-${nextDay}` : ''
    onChange?.(value)
  }

  function handleDayChange(value: string) {
    setDay(value)
    composeAndEmit(value, month, year)
  }

  function handleMonthChange(value: string) {
    // A previously-picked day can be invalid for the new month (e.g. day 31
    // switching from January to February) — clear it rather than silently
    // keeping an impossible date selected.
    const maxDayForMonth = value && year ? daysInMonth(Number(value), Number(year)) : 31
    const nextDay = day && Number(day) > maxDayForMonth ? '' : day
    setMonth(value)
    if (nextDay !== day) setDay(nextDay)
    composeAndEmit(nextDay, value, year)
  }

  function handleYearChange(value: string) {
    // Same clamp as month, for the Feb 29 -> non-leap-year case.
    const maxDayForYear = month && value ? daysInMonth(Number(month), Number(value)) : 31
    const nextDay = day && Number(day) > maxDayForYear ? '' : day
    setYear(value)
    if (nextDay !== day) setDay(nextDay)
    composeAndEmit(nextDay, month, value)
  }

  const isoValue = day && month && year ? `${year}-${month}-${day}` : ''
  const selectClass = `w-full rounded-lg border bg-white dark:bg-gray-900 px-2 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none ${
    error
      ? 'border-red-400 focus:border-red-500'
      : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
  }`

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Day</span>
          <select
            aria-label={`${label} — Day`}
            required={required}
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={pad(d)}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Month</span>
          <select
            aria-label={`${label} — Month`}
            required={required}
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Month</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={pad(i + 1)}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Year</span>
          <select
            aria-label={`${label} — Year`}
            required={required}
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {name && <input type="hidden" name={name} value={isoValue} />}
    </div>
  )
}
