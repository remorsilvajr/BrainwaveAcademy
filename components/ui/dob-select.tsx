'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

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

// A custom trigger+panel dropdown instead of a native <select> — a native
// select's popup is entirely browser-controlled, and with ~80+ Year options
// (or even the 31 Day options) it renders every option in one long list,
// which the browser then has to flip upward ("drop-up") whenever there
// isn't enough room below the trigger to fit all of them. Capping this
// panel's own height with `max-h-56 overflow-y-auto` (roughly 6-7 rows
// visible, scroll for the rest) means it never needs more room than that
// fixed height, so it reliably opens downward regardless of how many
// options exist or where the trigger sits on the page.
//
// The panel renders through a portal into `document.body`, positioned with
// `position: fixed` at coordinates read from the trigger's own
// `getBoundingClientRect()`. This isn't optional polish — every one of this
// component's real call sites (the admin record modals, User Management's
// Edit modal) sits inside a `Modal` whose body is `overflow-y-auto`,
// and a plain `absolute`-positioned panel gets silently clipped by that
// ancestor's overflow the moment it would extend past the scrollable
// region's edge (found live: the Year list only showed its first ~2 rows
// before being cut off, well short of the intended 6-7). A portal escapes
// that ancestor entirely. Since a `position: fixed` panel doesn't move if
// its own scroll container scrolls out from under it, the panel closes
// itself on any scroll (capture-phase, so it also catches scrolling inside
// the Modal body, which doesn't bubble a 'scroll' event to window) rather
// than drifting away from the trigger.
//
// The backdrop and panel use `z-[70]`/`z-[80]`, not the more ordinary
// `z-40`/`z-50` this app uses elsewhere — because they're portaled to
// `document.body`, they're siblings of `Modal`'s own `fixed z-50` wrapper
// in the real DOM, not descendants of it, so they need a higher z-index to
// actually win the stacking comparison. At `z-40` this was confirmed live:
// clicking anywhere inside the modal to dismiss the open dropdown did
// nothing, because the Modal card (inside the z-50 wrapper) was still
// painted on top of the backdrop and ate the click.
function DropdownField({
  value,
  options,
  placeholder,
  ariaLabel,
  hasError,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  ariaLabel: string
  hasError?: boolean
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  function openDropdown() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return
    // Scrolling *inside* the panel's own option list must not close it —
    // only a scroll somewhere else (e.g. the Modal body it's anchored to)
    // should, since that's what would otherwise leave this `position: fixed`
    // panel visually detached from its trigger.
    function closeOnScroll(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      setIsOpen(false)
    }
    window.addEventListener('scroll', closeOnScroll, true)
    return () => window.removeEventListener('scroll', closeOnScroll, true)
  }, [isOpen])

  function selectOption(optionValue: string) {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
        }}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border bg-white dark:bg-gray-900 px-2 py-2.5 text-sm focus:outline-none ${
          selected ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
        } ${
          hasError
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setIsOpen(false)} />
            <div
              ref={panelRef}
              role="listbox"
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[80] max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg"
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => selectOption(o.value)}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    o.value === value ? 'font-semibold text-[#0b1b62] dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

// Day/Month/Year dropdowns that compose into the same "YYYY-MM-DD" string a
// native <input type="date"> would produce. Two calling conventions, picked
// per site's existing form pattern rather than forcing one shape everywhere:
// - `name` set (no FormData change needed): renders a hidden input carrying
//   the combined value, so `formData.get(name)` on the existing Server
//   Action keeps working unchanged (see components/enroll/enrollment-form.tsx).
// - `onChange` used without relying on `name`: fires the combined ISO string
//   on every change, for call sites that hold `dob` in local state and pass
//   it directly into a bound Server Action call (the admin record modals,
//   both roles' My Profile forms) — swap `onChange={setDob}` in for the old
//   `onChange={(e) => setDob(e.target.value)}`.
//
// `defaultValue` seeds the three fields once on mount, deliberately not
// re-synced on every prop change — this project's own convention already
// warns that a <select>'s `defaultValue` re-applies on every re-render
// (unlike <input>, where it only applies once), which snaps a dropdown back
// to blank the instant unrelated state changes elsewhere on the page. These
// three fields are genuinely controlled (`value`/`onChange`), just seeded
// from an internal `useState` initializer rather than the live prop, which
// sidesteps that bug the same way an uncontrolled <input defaultValue> does.
//
// Note: since Day/Month/Year are no longer real <select> elements (see
// DropdownField above), the browser's native "please fill out this field"
// popup no longer fires for `required` — that was already unreliable once
// these lived inside a hidden input for the FormData sites (hidden inputs
// don't get constraint-validated at all). `required` now only drives a
// visual "*" next to the label; server-side validation (isValidDob, plus
// each action's own required-field checks) is the real enforcement
// everywhere DOB is accepted, same as before.
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

  const dayOptions = days.map((d) => ({ value: pad(d), label: String(d) }))
  const monthOptions = MONTH_NAMES.map((m, i) => ({ value: pad(i + 1), label: m }))
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }))

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Day</span>
          <DropdownField
            value={day}
            options={dayOptions}
            placeholder="Day"
            ariaLabel={`${label} — Day`}
            hasError={!!error}
            onChange={handleDayChange}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Month</span>
          <DropdownField
            value={month}
            options={monthOptions}
            placeholder="Month"
            ariaLabel={`${label} — Month`}
            hasError={!!error}
            onChange={handleMonthChange}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Year</span>
          <DropdownField
            value={year}
            options={yearOptions}
            placeholder="Year"
            ariaLabel={`${label} — Year`}
            hasError={!!error}
            onChange={handleYearChange}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {name && <input type="hidden" name={name} value={isoValue} />}
    </div>
  )
}
