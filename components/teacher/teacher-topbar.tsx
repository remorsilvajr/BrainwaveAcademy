'use client'

import { usePathname } from 'next/navigation'
import { User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'

type Teacher = { first_name: string; last_name: string; avatar_url: string | null }

export function TeacherTopBar({ sections, teacher }: { sections: NavSection[]; teacher: Teacher }) {
  const pathname = usePathname()

  const title =
    pathname === '/teacher'
      ? 'Brainwave Dashboard'
      : (sections.flatMap((s) => s.items).find((item) => item.href === pathname)?.label ?? 'Brainwave Dashboard')

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-8 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0b1b62]">{title}</h1>

        <div className="flex items-center gap-2.5">
          {teacher.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <UserIcon className="h-5 w-5" />
            </span>
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">
              {teacher.last_name}, {teacher.first_name.charAt(0)}.
            </p>
            <p className="text-xs text-gray-500">Teacher</p>
          </div>
        </div>
      </div>
    </header>
  )
}
