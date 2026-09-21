'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Backpack, ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'
import { ProfileMenu } from '@/components/ui/profile-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notifications/notification-bell'

type Student = { id: string; first_name: string; last_name: string }
type Parent = { first_name: string; last_name: string; avatar_url: string | null }

export function ParentTopBar({
  sections,
  students,
  parent,
}: {
  sections: NavSection[]
  students: Student[]
  parent: Parent
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [studentMenuOpen, setStudentMenuOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  // The dropdown's own click-away backdrop only closes it on a click
  // *outside* the panel — a sidebar link click navigates via router.push
  // without ever triggering that backdrop, so the panel was staying open
  // (and stale) across a tab change. Closing it here, inline during render
  // when pathname changes, matches this app's established pattern for
  // adjusting state off a changed value (see TopProgressBar/Pagination)
  // rather than a useEffect, which would trigger a needless extra render.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setStudentMenuOpen(false)
  }

  const title =
    pathname === '/parent'
      ? 'Brainwave Dashboard'
      : (sections.flatMap((s) => s.items).find((item) => item.href === pathname)?.label ?? 'Brainwave Dashboard')

  const selectedId = searchParams.get('student') ?? students[0]?.id ?? null
  const selected = students.find((s) => s.id === selectedId) ?? null

  function selectStudent(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('student', id)
    router.push(`${pathname}?${params.toString()}`)
    setStudentMenuOpen(false)
  }

  return (
    <header className="sticky top-14 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 sm:px-8 lg:top-0">
      {/* One row like the admin/teacher bars: title left; child switcher, bell,
          theme and profile at the top right. On a phone there isn't room for the
          title beside the switcher (and the page has its own heading right
          below), so with children on the account the title is hidden below `sm`
          and the controls sit right-aligned; the profile shrinks to the avatar. */}
      <div className="flex items-center gap-x-2 sm:gap-x-3">
        <h1
          className={`min-w-0 flex-1 truncate text-lg font-bold text-[#0b1b62] dark:text-indigo-300 sm:block sm:text-xl ${students.length > 0 ? 'hidden' : ''}`}
        >
          {title}
        </h1>

        {students.length > 0 && (
          <div className="relative ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setStudentMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <Backpack className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              <span className="hidden sm:inline">Child: </span>
              <span className="max-w-[8rem] truncate sm:max-w-none">
                {selected ? `${selected.first_name} ${selected.last_name}` : 'Select'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>

            {studentMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStudentMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg">
                  {students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStudent(s.id)}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        s.id === selectedId ? 'font-semibold text-[#0b1b62] dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {s.first_name} {s.last_name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <NotificationBell />

        <ThemeToggle className="text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10" />

        <ProfileMenu
          myProfileHref="/parent/my-profile"
          settingsHref="/parent/settings"
          showFeedbackLinks={false}
          triggerClassName="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-2.5"
        >
          {parent.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={parent.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              <UserIcon className="h-5 w-5" />
            </span>
          )}
          <div className="hidden leading-tight text-left sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {parent.last_name}, {parent.first_name.charAt(0)}.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Parent / Guardian</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        </ProfileMenu>
      </div>
    </header>
  )
}
