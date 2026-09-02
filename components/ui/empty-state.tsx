import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type LinkAction = { href: string; label: string }
type Tone = 'neutral' | 'warning' | 'error'

// Shared "there's nothing here yet" card — an icon circle, a heading, one
// explanatory line naming what belongs here and why it's empty, and a real
// link to wherever the person should go next instead of a bare sentence.
// Extracted 2026-09-02 after building this same shape by hand for
// Requirements' two empty states and then finding ~6 more pages across all
// three portals sharing the exact same older "one line of gray text in a
// card" pattern (no icon, no heading, easy to miss) — see CLAUDE.md.
//
// Three tones, all in the same card shape: `neutral` (the common case —
// nothing exists yet, sky icon, solid pink CTA), `warning` (something
// specific is blocking progress, e.g. waiting on someone else — amber icon,
// navy-outlined CTA), and `error` (a definite negative outcome, e.g. a
// request was rejected, not just pending — red icon, red-outlined CTA).
// Pick `warning`/`error` only when the state itself is cautionary or
// negative, not just "empty" — and don't conflate the two: a rejected
// request and a pending one are different enough to need visually distinct
// treatment (found live — Requirements originally showed a rejected
// application as if it were merely awaiting approval, which is actively
// misleading, not just imprecise).
const toneStyles: Record<
  Tone,
  { card: string; iconWrap: string; iconColor: string; action: string }
> = {
  neutral: {
    card: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
    iconWrap: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    action: 'bg-[#e6007e] text-white hover:bg-[#c9006e]',
  },
  warning: {
    card: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    action: 'border border-[#0b1b62] dark:border-indigo-300 text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5',
  },
  error: {
    card: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
    iconWrap: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    action: 'border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50',
  },
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  action,
  secondaryAction,
}: {
  icon: LucideIcon
  title: string
  description: string
  tone?: Tone
  action?: LinkAction
  // Rendered as "{prefix} {label}" with only the label linked — for a
  // less prominent second option below the primary action (see
  // Requirements' "Enrolling another child in the meantime?" link).
  secondaryAction?: LinkAction & { prefix: string }
}) {
  const styles = toneStyles[tone]

  return (
    <div className={`rounded-2xl border p-8 text-center ${styles.card}`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${styles.iconWrap}`}>
        <Icon className={`h-6 w-6 ${styles.iconColor}`} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={`mt-5 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold ${styles.action}`}
        >
          {action.label}
        </Link>
      )}
      {secondaryAction && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {secondaryAction.prefix}{' '}
          <Link href={secondaryAction.href} className="font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            {secondaryAction.label}
          </Link>
        </p>
      )}
    </div>
  )
}
