'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { DropdownField } from '@/components/ui/dropdown-field'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => ({ value: h, label: h }))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => ({ value: m, label: m }))
const PERIODS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
]

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

// Hour / Minute / AM-PM as three short finite lists, instead of the browser's
// <input type="time"> whose picker columns scroll endlessly in a loop. `value` and
// `onChange` use "HH:MM" (24-hour); onChange fires only once all three parts are
// chosen, or with '' when cleared.
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
  const [parts, setParts] = useState(() => toParts(value))
  // Follow a new value from outside (e.g. after a save), the "adjust state on prop change" pattern.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setParts(toParts(value))
  }

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next }
    setParts(merged)
    const full = toValue(merged.hour, merged.minute, merged.period)
    if (full) onChange(full)
  }

  const w = size === 'sm' ? { hour: 'w-14', minute: 'w-14', period: 'w-16' } : { hour: 'w-20', minute: 'w-20', period: 'w-20' }
  return (
    <span className="inline-flex items-center gap-1">
      <span className={w.hour}>
        <DropdownField size={size} value={parts.hour} options={HOURS} placeholder="Hr" ariaLabel={`${ariaLabel}, hour`} disabled={disabled} onChange={(hour) => update({ hour })} />
      </span>
      <span>:</span>
      <span className={w.minute}>
        <DropdownField size={size} value={parts.minute} options={MINUTES} placeholder="Min" ariaLabel={`${ariaLabel}, minute`} disabled={disabled} onChange={(minute) => update({ minute })} />
      </span>
      <span className={w.period}>
        <DropdownField size={size} value={parts.period} options={PERIODS} placeholder="AM" ariaLabel={`${ariaLabel}, AM or PM`} disabled={disabled} onChange={(period) => update({ period })} />
      </span>
      {clearable && value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setParts({ hour: '', minute: '', period: '' })
            onChange('')
          }}
          aria-label={`Clear ${ariaLabel}`}
          className="-m-1 rounded p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-60 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}
