'use client'

import { useRouter } from 'next/navigation'
import { todayIso } from '@/lib/format'

export function DateSelector({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="attendance-date" className="text-sm font-medium text-gray-600">
        Date:
      </label>
      <input
        id="attendance-date"
        type="date"
        value={date}
        max={todayIso()}
        onChange={(e) => e.target.value && router.push(`${basePath}?date=${e.target.value}`)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
      />
    </div>
  )
}
