'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, roundToCents } from '@/lib/format'

type Mode = 'limit' | 'remaining'

// The verdict on a typed peso amount. `limit`: the most a fee may be (Add Fee,
// Edit Fee, Record Cash Payment). `remaining`: what is still owed, so a payment may
// not exceed it (Pay Online, Mark Paid). `min`: a floor the amount can't go
// under (an edited fee can't drop below what's already been paid). The server
// re-checks every one of these.
export function checkAmount(value: string, max: number, mode: Mode, min = 0): { tone: 'none' | 'ok' | 'error'; text: string; ratio: number } {
  if (value.trim() === '') return { tone: 'none', text: '', ratio: 0 }
  const n = roundToCents(Number(value))
  const ratio = max > 0 ? Math.min(Math.max(n / max, 0), 1) : 0
  if (!Number.isFinite(n) || n <= 0) return { tone: 'error', text: 'Enter an amount greater than zero.', ratio: 0 }
  if (min > 0 && n < min) return { tone: 'error', text: `Can't be less than the ${formatCurrency(min)} already paid.`, ratio }
  if (n > max) {
    return {
      tone: 'error',
      text: mode === 'limit' ? `Over the ${formatCurrency(max)} limit.` : `More than the ${formatCurrency(max)} owed.`,
      ratio: 1,
    }
  }
  if (mode === 'limit') return { tone: 'ok', text: `${formatCurrency(n)} of the ${formatCurrency(max)} limit`, ratio }
  const left = roundToCents(max - n)
  return { tone: 'ok', text: left === 0 ? `Pays the full ${formatCurrency(max)}` : `${formatCurrency(left)} will still be owed after this`, ratio }
}

// Tailwind classes that colour an amount input's border by the verdict above
// (trailing "!" beats the input's own border colour).
export function amountBorder(tone: 'none' | 'ok' | 'error') {
  return tone === 'ok' ? 'border-green-500! focus:border-green-600!' : tone === 'error' ? 'border-red-400! focus:border-red-500!' : ''
}

// A thin bar (amount against its limit) and one line under an amount input.
export function AmountCheck({ value, max, mode, min = 0 }: { value: string; max: number; mode: Mode; min?: number }) {
  const { tone, text, ratio } = checkAmount(value, max, mode, min)
  if (tone === 'none') return null
  return (
    <div aria-live="polite" className="mt-1.5">
      <div className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden>
        <div
          className={`h-full rounded-full transition-all ${tone === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {tone === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
        <span>{text}</span>
      </p>
    </div>
  )
}
