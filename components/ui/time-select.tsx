'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

export function toParts(value: string): { hour: string; minute: string; period: string } {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return { hour: '', minute: '', period: '' }
  const h = Number(match[1])
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: match[2], period: h < 12 ? 'AM' : 'PM' }
}

export function toValue(hour: string, minute: string, period: string): string {
  if (!hour || !minute || !period) return ''
  const h = (Number(hour) % 12) + (period === 'PM' ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${minute}`
}

function label(value: string): string {
  const p = toParts(value)
  return p.hour ? `${p.hour}:${p.minute} ${p.period}` : ''
}

// One field like the browser's own time input ("7:45 AM" + a clock icon), opening a
// panel with Hour / Minute / AM-PM columns side by side. Unlike Chrome's picker the
// columns are finite lists (theirs scroll endlessly in a loop). The pick is applied
// when the panel closes (Done, Enter, or clicking outside) once all three parts are
// chosen, so a save happens once, not per column. `value` / `onChange` use "HH:MM"
// (24-hour); '' when cleared.
export function TimeSelect({
  value,
  onChange,
  ariaLabel,
  disabled,
  clearable = false,
  size = 'sm',
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
  clearable?: boolean
  // 'sm' for tight rows (attendance roster), 'md' to match full-size form fields.
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => toParts(value))
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect()
    // The panel is about 190px wide; keep it on screen near the right edge (phones).
    if (rect) setPosition({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 198)) })
    setDraft(toParts(value))
    setOpen(true)
  }

  function close(apply: boolean) {
    setOpen(false)
    if (!apply) return
    const next = toValue(draft.hour, draft.minute, draft.period)
    if (next && next !== value.slice(0, 5)) onChange(next)
  }

  useEffect(() => {
    if (!open) return
    // Each column opens on its current choice.
    panelRef.current?.querySelectorAll('[aria-selected="true"]').forEach((el) => el.scrollIntoView({ block: 'center' }))
    // A scroll elsewhere would leave this fixed panel detached from its field.
    function onScroll(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  // Escape cancels and Enter applies, wherever focus is (it stays on the field).
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current(false)
      if (e.key === 'Enter') {
        e.preventDefault()
        closeRef.current(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const text = label(value)
  const column = (items: string[], selected: string, pick: (v: string) => void, name: string) => (
    <div role="listbox" aria-label={name} className="h-48 w-14 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={item === selected}
          onClick={() => pick(item)}
          className={`block w-full rounded-md py-1.5 text-center text-sm ${
            item === selected
              ? 'bg-[#0b1b62] font-semibold text-white dark:bg-indigo-400 dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={text ? `${ariaLabel}: ${text}` : ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(true) : openPanel())}
        className={`inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left tabular-nums focus:border-[#0b1b62] focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-gray-800 dark:focus:border-indigo-400 ${
          size === 'sm' ? 'w-[104px] px-2 py-1 text-xs' : 'w-full px-3 py-2 text-sm'
        } ${text ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-gray-500'}`}
      >
        <span>{text || '--:-- --'}</span>
        <Clock className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 text-gray-400 dark:text-gray-500`} />
      </button>

      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => close(true)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-label={ariaLabel}
              style={{ top: position.top, left: position.left }}
              className="fixed z-[80] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex gap-1">
                {column(HOURS, draft.hour, (hour) => setDraft((d) => ({ ...d, hour, minute: d.minute || '00', period: d.period || 'AM' })), 'Hour')}
                {column(MINUTES, draft.minute, (minute) => setDraft((d) => ({ ...d, minute })), 'Minute')}
                {column(PERIODS, draft.period, (period) => setDraft((d) => ({ ...d, period })), 'AM or PM')}
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-gray-100 px-1 pt-1 dark:border-gray-800">
                {clearable && value ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onChange('')
                    }}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Clear
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[#0b1b62] hover:bg-gray-100 dark:text-indigo-300 dark:hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  )
}
