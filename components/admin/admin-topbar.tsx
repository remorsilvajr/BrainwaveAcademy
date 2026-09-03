'use client'

import { usePathname } from 'next/navigation'
import { ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'
import { ProfileMenu } from '@/components/ui/profile-menu'
import { ThemeToggle } from '@/components/theme-toggle'

type Admin = { first_name: string; last_name: string; avatar_url: string | null }

// Mirrors TeacherTopBar exactly, with two differences: no myProfileHref
// (admin has no self-service My Profile page — account editing for any
// user, including an admin's own, already lives in User Management), and
// the "Administrator" subtitle instead of a role name. That's it — this
// component never reads or branches on is_super_admin, so a super admin's
// topbar renders byte-for-byte identical to a regular admin's, which is
// what CLAUDE.md's "the concept of a super admin tier must not be
// discoverable anywhere in the portal" rule requires.
export function AdminTopBar({ sections, admin }: { sections: NavSection[]; admin: Admin }) {
  const pathname = usePathname()

  const title =
    pathname === '/admin'
      ? 'Brainwave Dashboard'
      : (sections.flatMap((s) => s.items).find((item) => item.href === pathname)?.label ?? 'Brainwave Dashboard')

  return (
    <header className="sticky top-14 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 sm:px-8 lg:top-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300 sm:text-xl">{title}</h1>

        <div className="flex items-center gap-2">
          <ThemeToggle className="text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10" />

          <ProfileMenu
            settingsHref="/admin/settings"
            triggerClassName="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {admin.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={admin.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                <UserIcon className="h-5 w-5" />
              </span>
            )}
            <div className="leading-tight text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {admin.last_name}, {admin.first_name.charAt(0)}.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
          </ProfileMenu>
        </div>
      </div>
    </header>
  )
}
