'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'

// A live line under a reason / note box with a length rule, so the person sees
// the rule before pressing the button: red "3 more characters needed" while
// under the minimum (once something is typed), green with a check once it is
// long enough, amber when close to the maximum. Counts trimmed text, the same
// way the server checks it. A box with no minimum (min 0) just counts toward
// the maximum.
export function LengthMeter({ value, min = 0, max }: { value: string; min?: number; max: number }) {
  const length = value.trim().length
  if (length === 0 && min === 0) return null

  const short = length < min
  const near = length >= Math.floor(max * 0.9)
  const over = length > max
  const tone = over || (short && length > 0) ? 'error' : short ? 'idle' : near ? 'warn' : 'ok'

  const text = over
    ? `${length - max} characters over the ${max} limit`
    : short
      ? length === 0
        ? `At least ${min} characters`
        : `${min - length} more character${min - length === 1 ? '' : 's'} needed`
      : `${length} / ${max}`

  return (
    <p
      aria-live="polite"
      className={`mt-1 flex items-center gap-1 text-xs font-medium ${
        tone === 'error'
          ? 'text-red-600 dark:text-red-400'
          : tone === 'warn'
            ? 'text-amber-600 dark:text-amber-400'
            : tone === 'ok'
              ? 'text-green-700 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {tone === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      {tone === 'ok' && min > 0 && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
      <span>{text}</span>
    </p>
  )
}
