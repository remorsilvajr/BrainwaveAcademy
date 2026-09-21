'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Backpack } from 'lucide-react'

type Student = { id: string; first_name: string; last_name: string }

// The pages whose content depends on which child is selected. Everywhere else (the
// dashboard summarises every child, Announcement/Calendar/Album/Feedback/Settings
// are not about one child) the banner stays out of the way.
const PER_CHILD_PATHS = [
  '/parent/enrollment-status',
  '/parent/requirements',
  '/parent/payments',
  '/parent/students',
  '/parent/student-dashboard',
  '/parent/pickup',
  '/parent/health',
  '/parent/unenrollment',
]

// A strip under the top bar saying whose information the page is showing, so a
// parent with more than one child never has to guess (or scroll up to the top-bar
// chip). The selection itself is only the ?student= URL param, exactly as in
// ParentTopBar: with none, the first child is the default. With more than one child
// there is a switcher right here too.
export function SelectedChildBanner({ students }: { students: Student[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  if (students.length === 0 || !PER_CHILD_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  const selectedId = searchParams.get('student') ?? students[0].id
  const selected = students.find((s) => s.id === selectedId) ?? students[0]

  function switchTo(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('student', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="border-b border-sky-100 bg-sky-50 px-4 py-2.5 dark:border-sky-900/50 dark:bg-sky-950/30 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="flex items-center gap-2 text-sky-900 dark:text-sky-200">
          <Backpack className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Showing information for{' '}
            <strong className="font-semibold">
              {selected.first_name} {selected.last_name}
            </strong>
          </span>
        </span>
        {students.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-sky-800 dark:text-sky-300 sm:ml-auto">
            Switch child
            <select
              value={selected.id}
              onChange={(e) => switchTo(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-[#0b1b62] focus:outline-none dark:border-sky-800 dark:bg-gray-800 dark:text-slate-100"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900 dark:bg-gray-800 dark:text-slate-100">
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}
