import { formatCurrency } from '@/lib/format'

// How much of a fee (or a student's fees) has been paid: the paid part green,
// the rest grey, or red once it is overdue. Used on the parent's fee rows and
// in admin's Student Balances.
export function PaidBar({
  paid,
  total,
  overdue = false,
  showLabel = true,
  className = '',
}: {
  paid: number
  total: number
  overdue?: boolean
  showLabel?: boolean
  className?: string
}) {
  if (total <= 0) return null
  const ratio = Math.min(Math.max(paid / total, 0), 1)
  const percent = Math.round(ratio * 100)
  const full = ratio >= 1
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${percent}% paid`}
        className={`flex h-1.5 overflow-hidden rounded-full ${overdue && !full ? 'bg-red-200 dark:bg-red-950' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      {showLabel && (
        <p className={`mt-1 text-xs ${full ? 'text-green-700 dark:text-green-400' : overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {full ? 'Fully paid' : `${formatCurrency(paid)} of ${formatCurrency(total)} paid (${percent}%)`}
        </p>
      )}
    </div>
  )
}
