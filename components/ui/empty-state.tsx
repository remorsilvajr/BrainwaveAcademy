import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type LinkAction = { href: string; label: string }

// Shared "there's nothing here yet" card — an icon circle, a heading, one
// explanatory line naming what belongs here and why it's empty, and a real
// link to wherever the person should go next instead of a bare sentence.
// Extracted 2026-09-02 after building this same shape by hand for
// Requirements' two empty states and then finding ~6 more pages across all
// three portals sharing the exact same older "one line of gray text in a
// card" pattern (no icon, no heading, easy to miss) — see CLAUDE.md.
//
// Two tones: `neutral` (the common case — nothing exists yet, sky icon,
// solid pink CTA) and `warning` (something specific is blocking progress,
// e.g. waiting on someone else — amber icon, outlined CTA). Pick `warning`
// only when the empty state itself is cautionary, not just "empty."
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
  tone?: 'neutral' | 'warning'
  action?: LinkAction
  // Rendered as "{prefix} {label}" with only the label linked — for a
  // less prominent second option below the primary action (see
  // Requirements' "Enrolling another child in the meantime?" link).
  secondaryAction?: LinkAction & { prefix: string }
}) {
  const isWarning = tone === 'warning'

  return (
    <div
      className={`rounded-2xl border p-8 text-center ${
        isWarning
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          isWarning ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-sky-50 dark:bg-sky-950/40'
        }`}
      >
        <Icon className={`h-6 w-6 ${isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={
            isWarning
              ? 'mt-5 inline-block rounded-lg border border-[#0b1b62] dark:border-indigo-300 px-5 py-2.5 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5'
              : 'mt-5 inline-block rounded-lg bg-[#e6007e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e]'
          }
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
