'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutGrid,
  Megaphone,
  Users,
  ListChecks,
  UserPlus,
  FileText,
  User,
  UserCheck,
  GraduationCap,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { LogoutButton } from './logout-button'
import { ThemeToggle } from './theme-toggle'

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
  teacher: UserCheck,
  graduationCap: GraduationCap,
  settings: SettingsIcon,
  logout: LogOut,
  trash: Trash2,
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

// A slim top-of-page bar showing sidebar-navigation progress. An earlier
// version used next/link's useLinkStatus() to swap the clicked link's own
// icon for a spinner, but that hook's `pending` only covers the brief
// window before the URL updates — reported live as invisible in practice,
// since that flip happens almost immediately, well before the destination
// page's data is actually ready. This instead tracks a real React
// transition wrapping the navigation's router.push (see Sidebar's
// handleLinkClick, which intercepts <Link>'s own click handling via
// preventDefault specifically so useLinkStatus's tracking — now
// unreachable — was removed rather than left as dead code). The
// transition's `isPending` stays true for its full lifetime, including
// while a Suspense boundary further down the tree (the role's loading.tsx)
// is still resolving, giving a sustained "this is still loading" signal
// instead of an instant flash.
function TopProgressBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const [lastActive, setLastActive] = useState(active)

  // The instant part of each transition (show + jump to 15%, or jump to
  // 100%) happens inline during render the moment `active` flips — React's
  // documented "adjusting state when a prop changes" pattern — rather than
  // in the effect below, so only the genuinely time-delayed follow-ups
  // (inside a setTimeout callback, not synchronous in the effect body)
  // need the effect at all.
  if (active !== lastActive) {
    setLastActive(active)
    if (active) {
      setVisible(true)
      setWidth(15)
    } else {
      setWidth(100)
    }
  }

  useEffect(() => {
    if (active) {
      const growTimer = setTimeout(() => setWidth(80), 50)
      return () => clearTimeout(growTimer)
    }
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 300)
    return () => clearTimeout(hideTimer)
  }, [active])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-[#e6007e]"
        style={{
          width: `${width}%`,
          transition: width === 100 ? 'width 200ms ease' : 'width 1.2s ease-out',
        }}
      />
    </div>
  )
}

// Split out from Sidebar specifically so only this part needs the
// <Suspense> boundary useSearchParams() requires for prerendered routes
// (admin/teacher pages are statically prerendered and don't use the
// ?student= param at all) — everything else in Sidebar stays prerenderable.
function NavLinks({
  sections,
  onNavigate,
  onLinkClick,
}: {
  sections: NavSection[]
  onNavigate?: () => void
  onLinkClick: (href: string, e: React.MouseEvent) => void
}) {
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
                    onClick={(e) => {
                      onLinkClick(hrefWithStudent(item.href!), e)
                      onNavigate?.()
                    }}
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
  // Below the `lg` breakpoint the desktop aside is hidden entirely and
  // replaced by this fixed top strip (hamburger + name) plus an off-canvas
  // drawer — the same NavLinks content, just reachable without permanently
  // eating ~70% of a phone's width. See app/*/layout.tsx for the matching
  // `pt-14 lg:pt-0 lg:ml-64` on the content side, and each role's top bar
  // for the matching `top-14 lg:top-0` so nothing sticks underneath this.
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // The drawer itself is position:fixed (doesn't move with scroll), but
  // nothing was stopping the page underneath it from scrolling — on mobile,
  // a fast scroll gesture behind the open drawer let the browser's own
  // address/toolbar collapse mid-scroll, which visibly lagged the fixed
  // drawer's bottom edge for a frame and let the page behind show through.
  // Locking body scroll while the drawer is open removes the underlying
  // scroll gesture entirely, which removes the trigger for that lag.
  useEffect(() => {
    if (!isMobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileOpen])

  // Intercepts a normal left-click to route it through startTransition (so
  // TopProgressBar's `isPending` tracks it) instead of letting <Link> do
  // its own default navigation. Modified clicks (ctrl/cmd/shift/middle) are
  // left alone so "open in new tab" etc. keep working normally.
  function handleLinkClick(href: string, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      <TopProgressBar active={isPending} />
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
        <ThemeToggle className="ml-auto text-white hover:bg-white/10" />
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
                <NavLinks
                  sections={sections}
                  onNavigate={() => setIsMobileOpen(false)}
                  onLinkClick={handleLinkClick}
                />
              </Suspense>
            </nav>
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col overflow-y-auto bg-[#0b1b62] p-4 lg:flex">
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div>
            <p className="text-lg font-bold text-white">{schoolName}</p>
            {portalLabel && <p className="text-xs text-[#8f9bd6]">{portalLabel}</p>}
          </div>
          <ThemeToggle className="text-white hover:bg-white/10" />
        </div>

        <nav className="flex-1 space-y-6">
          <Suspense fallback={<NavLinksFallback sections={sections} />}>
            <NavLinks sections={sections} onLinkClick={handleLinkClick} />
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
