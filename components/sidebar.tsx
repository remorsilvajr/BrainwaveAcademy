'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutGrid,
  Megaphone,
  Users,
  ListChecks,
  UserPlus,
  FileText,
  User,
  GraduationCap,
  Settings as SettingsIcon,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { LogoutButton } from './logout-button'

// Icons are resolved here, inside the Client Component, from a plain
// string name — NOT passed in as actual component references from a
// Server Component layout, which Next.js doesn't allow (only serializable
// data can cross the server -> client boundary).
export const iconMap = {
  dashboard: LayoutGrid,
  announcement: Megaphone,
  users: Users,
  checklist: ListChecks,
  userPlus: UserPlus,
  file: FileText,
  user: User,
  graduationCap: GraduationCap,
  settings: SettingsIcon,
  logout: LogOut,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof iconMap

export type NavItem = {
  label: string
  href?: string
  icon?: IconName
  isLogout?: boolean
}

export type NavSection = {
  title?: string
  items: NavItem[]
}

// Split out from Sidebar specifically so only this part needs the
// <Suspense> boundary useSearchParams() requires for prerendered routes
// (admin/teacher pages are statically prerendered and don't use the
// ?student= param at all) — everything else in Sidebar stays prerenderable.
function NavLinks({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Preserves the top bar's selected-student param (?student=...) across
  // sidebar navigation — Link hrefs are plain paths with no query string,
  // so without this, clicking to another page silently dropped the
  // selection and each page fell back to its own default.
  const selectedStudent = searchParams.get('student')
  function hrefWithStudent(href: string) {
    return selectedStudent ? `${href}?student=${selectedStudent}` : href
  }

  return (
    <>
      {sections.map((section, i) => (
        <div key={i}>
          {section.title && (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6b78b0]">
              {section.title}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              if (item.isLogout) {
                return (
                  <li key={item.label}>
                    <LogoutButton icon={item.icon} />
                  </li>
                )
              }

              const Icon = item.icon ? iconMap[item.icon] : undefined
              const active = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={hrefWithStudent(item.href!)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                      active
                        ? 'bg-[#e6007e] text-white'
                        : 'text-[#c7cff0] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

export function Sidebar({
  sections,
  schoolName = 'Brainwave Academy',
  portalLabel,
}: {
  sections: NavSection[]
  schoolName?: string
  portalLabel?: string
}) {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 shrink-0 flex-col overflow-y-auto bg-[#0b1b62] p-4">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold text-white">{schoolName}</p>
        {portalLabel && <p className="text-xs text-[#8f9bd6]">{portalLabel}</p>}
      </div>

      <nav className="flex-1 space-y-6">
        <Suspense fallback={<NavLinksFallback sections={sections} />}>
          <NavLinks sections={sections} />
        </Suspense>
      </nav>
    </aside>
  )
}

// Static fallback shown only for the brief moment before NavLinks hydrates
// (or as the prerendered HTML for static routes) — same links, just without
// student-param preservation, which only ever matters for client-side
// navigation after hydration anyway.
function NavLinksFallback({ sections }: { sections: NavSection[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <div key={i}>
          {section.title && (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6b78b0]">
              {section.title}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              if (item.isLogout) {
                return (
                  <li key={item.label}>
                    <LogoutButton icon={item.icon} />
                  </li>
                )
              }

              const Icon = item.icon ? iconMap[item.icon] : undefined

              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#c7cff0] hover:bg-white/10 hover:text-white"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}
