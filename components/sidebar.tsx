'use client'

import { Suspense, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
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
  Menu,
  X,
  Loader2,
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

// useLinkStatus() only works in a descendant of the specific <Link> whose
// pending state it's reading, so the icon + label live in their own child
// component rather than being rendered directly inside the <Link> in
// NavLinks. Swaps the icon for a spinner (same h-4 w-4 footprint, so no
// layout shift) and dims the label while this link's navigation is still
// resolving — reported live as feeling "slow/sluggish" with no feedback
// that a click had even registered, since every route here is a fully
// server-rendered page waiting on its own Supabase queries. Skipped
// automatically once the destination has been prefetched (the common
// case), so it only shows up when there's an actual wait to cover.
function NavLinkRow({ label, Icon }: { label: string; Icon?: LucideIcon }) {
  const { pending } = useLinkStatus()
  return (
    <>
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className={pending ? 'opacity-70' : undefined}>{label}</span>
    </>
  )
}

// Split out from Sidebar specifically so only this part needs the
// <Suspense> boundary useSearchParams() requires for prerendered routes
// (admin/teacher pages are statically prerendered and don't use the
// ?student= param at all) — everything else in Sidebar stays prerenderable.
function NavLinks({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
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
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                      active
                        ? 'bg-[#e6007e] text-white'
                        : 'text-[#c7cff0] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <NavLinkRow label={item.label} Icon={Icon} />
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
  // Below the `lg` breakpoint the desktop aside is hidden entirely and
  // replaced by this fixed top strip (hamburger + name) plus an off-canvas
  // drawer — the same NavLinks content, just reachable without permanently
  // eating ~70% of a phone's width. See app/*/layout.tsx for the matching
  // `pt-14 lg:pt-0 lg:ml-64` on the content side, and each role's top bar
  // for the matching `top-14 lg:top-0` so nothing sticks underneath this.
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 bg-[#0b1b62] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">{schoolName}</p>
          {portalLabel && <p className="text-[11px] text-[#8f9bd6]">{portalLabel}</p>}
        </div>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-64 max-w-[80vw] flex-col overflow-y-auto bg-[#0b1b62] p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <p className="text-lg font-bold text-white">{schoolName}</p>
                {portalLabel && <p className="text-xs text-[#8f9bd6]">{portalLabel}</p>}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#c7cff0] hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-6">
              <Suspense fallback={<NavLinksFallback sections={sections} />}>
                <NavLinks sections={sections} onNavigate={() => setIsMobileOpen(false)} />
              </Suspense>
            </nav>
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col overflow-y-auto bg-[#0b1b62] p-4 lg:flex">
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
    </>
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
