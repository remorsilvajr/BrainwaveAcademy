'use client'

import { useRouter } from 'next/navigation'
import { todayIso } from '@/lib/format'

export function DateSelector({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="attendance-date" className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Date:
      </label>
      <input
        id="attendance-date"
        type="date"
        value={date}
        max={todayIso()}
        onChange={(e) => e.target.value && router.push(`${basePath}?date=${e.target.value}`)}
        // A native date input only opens its picker on a click that lands
        // directly on the small calendar icon by default — clicking the
        // date text itself just focuses the field. showPicker() forces the
        // picker open regardless of where in the field was clicked; the
        // try/catch is for browsers that don't support it (e.g. Safari),
        // where this just falls back to the field's normal click behavior.
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            // Unsupported — no-op, default click behavior still applies.
          }
        }}
        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
      />
    </div>
  )
}
