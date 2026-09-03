'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'
import { ProfileMenu } from '@/components/ui/profile-menu'

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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300 sm:text-xl">{title}</h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {students.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setStudentMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              >
                <span aria-hidden="true">🎒</span>
                <span className="hidden sm:inline">Child: </span>
                {selected ? `${selected.first_name} ${selected.last_name}` : 'Select'}
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>

              {studentMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStudentMenuOpen(false)} />
                  <div className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg sm:left-auto sm:right-0">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s.id)}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
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

          <ProfileMenu
            myProfileHref="/parent/my-profile"
            settingsHref="/parent/settings"
            triggerClassName="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-2.5"
          >
            {parent.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parent.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                <UserIcon className="h-5 w-5" />
              </span>
            )}
            <div className="leading-tight text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {parent.last_name}, {parent.first_name.charAt(0)}.
              </p>
              <p className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">Parent / Guardian</p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
          </ProfileMenu>
        </div>
      </div>
    </header>
  )
}
