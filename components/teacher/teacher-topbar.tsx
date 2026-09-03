'use client'

import { usePathname } from 'next/navigation'
import { ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'
import { ProfileMenu } from '@/components/ui/profile-menu'

type Teacher = { first_name: string; last_name: string; avatar_url: string | null }

export function TeacherTopBar({ sections, teacher }: { sections: NavSection[]; teacher: Teacher }) {
  const pathname = usePathname()

  const title =
    pathname === '/teacher'
      ? 'Brainwave Dashboard'
      : (sections.flatMap((s) => s.items).find((item) => item.href === pathname)?.label ?? 'Brainwave Dashboard')

  return (
    <header className="sticky top-14 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 sm:px-8 lg:top-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300 sm:text-xl">{title}</h1>

        <ProfileMenu
          myProfileHref="/teacher/my-profile"
          settingsHref="/teacher/settings"
          triggerClassName="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {teacher.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              <UserIcon className="h-5 w-5" />
            </span>
          )}
          <div className="leading-tight text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {teacher.last_name}, {teacher.first_name.charAt(0)}.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        </ProfileMenu>
      </div>
    </header>
  )
}
