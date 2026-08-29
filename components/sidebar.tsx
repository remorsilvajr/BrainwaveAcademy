'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from './logout-button'

export type NavItem = {
  label: string
  href?: string
  isLogout?: boolean
}

export type NavSection = {
  title?: string
  items: NavItem[]
}

export function Sidebar({
  sections,
  schoolName = 'Preschool Name',
}: {
  sections: NavSection[]
  schoolName?: string
}) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 min-h-screen sticky top-0 flex flex-col p-4 bg-white">
      <div className="font-semibold text-lg mb-6 px-2">{schoolName}</div>

      <nav className="flex-1 space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2 px-2">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                if (item.isLogout) {
                  return (
                    <li key={item.label}>
                      <LogoutButton />
                    </li>
                  )
                }

                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href!}
                      className={`block rounded px-3 py-2 text-sm ${
                        active
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
