'use client'

import { usePathname } from 'next/navigation'
import { ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'
import { ProfileMenu } from '@/components/ui/profile-menu'
import { ThemeToggle } from '@/components/theme-toggle'

type Cashier = { first_name: string; last_name: string; avatar_url: string | null }

// Same shape as AdminTopBar (title, theme toggle, profile menu) for the cashier portal, which
// only has Payments and Settings. No notification bell (nothing notifies a cashier) and no
// My Profile or feedback entries in the menu.
export function CashierTopBar({ sections, cashier }: { sections: NavSection[]; cashier: Cashier }) {
  const pathname = usePathname()

  const title =
    sections.flatMap((s) => s.items).find((item) => item.href && pathname.startsWith(item.href))?.label ?? 'Payments'

  return (
    <header className="sticky top-14 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 sm:px-8 lg:top-0">
      <div className="flex items-center gap-x-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[#0b1b62] dark:text-indigo-300 sm:text-xl">{title}</h1>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10" />

          <ProfileMenu
            settingsHref="/cashier/settings"
            showFeedbackLinks={false}
            triggerClassName="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {cashier.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cashier.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                <UserIcon className="h-5 w-5" />
              </span>
            )}
            <div className="hidden leading-tight text-left sm:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {cashier.last_name}, {cashier.first_name.charAt(0)}.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cashier</p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
          </ProfileMenu>
        </div>
      </div>
    </header>
  )
}
