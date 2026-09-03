'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, User as UserIcon, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProfileMenu } from '@/components/ui/profile-menu'
import { navigationItems } from './nav-items'
import type { PortalAuth } from '@/lib/get-portal-auth'

export function SiteHeader({ auth = null }: { auth?: PortalAuth }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Parents enroll additional children from inside their own portal, not
  // the public form — so a logged-in parent's Enroll button skips straight
  // to that page rather than the /enroll route middleware.ts would bounce
  // them away from anyway (see the isPublicOnly check there). Enroll is
  // hidden entirely for teacher/admin — there's no child of theirs to
  // enroll, and admin already has its own Enrollment Requests page for
  // reviewing every family's applications.
  const enrollHref = auth?.role === 'parent' ? '/parent/enroll-a-student' : '/enroll'
  const showEnroll = !auth || auth.role === 'parent'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#c6c5d2] bg-[#fbf8ff] shadow-[0px_1px_2px_#0000000d] dark:border-slate-700 dark:bg-slate-900">
      <nav
        className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[auto_1fr_auto]"
        aria-label="Primary navigation"
      >
        <Link href="/" className="block h-10 w-auto shrink-0" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-10 w-auto"
            alt="Brainwave Preschool Academy"
            src="/images/landing/logo.svg"
          />
        </Link>

        <ul className="hidden list-none items-center justify-center gap-6 p-0 m-0 lg:flex lg:gap-8">
          {navigationItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-sm font-semibold tracking-[0.14px] text-[#454650] hover:text-[#0b1b62] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62] dark:text-slate-300 dark:hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Enroll/Log In stay visible at every width, not just lg: — these
            are the landing page's primary conversion actions, so they
            shouldn't be buried inside the hamburger drawer alongside the
            nav links on mobile. Only the hamburger toggle itself is
            lg:hidden. */}
        <div className="flex shrink-0 items-center gap-1.5 justify-self-end sm:gap-2">
          {showEnroll && (
            <Link
              href={enrollHref}
              className="whitespace-nowrap rounded-full bg-[#e6007e] px-3 py-1.5 text-xs font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62] sm:px-6 sm:py-2 sm:text-sm"
            >
              Enroll
            </Link>
          )}

          {auth ? (
            <>
              <Link
                href={`/${auth.role}`}
                className="whitespace-nowrap rounded-full bg-[#0b1b62] px-3 py-1.5 text-xs font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#08154d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e] sm:px-6 sm:py-2 sm:text-sm"
              >
                Portal
              </Link>
              <ProfileMenu
                // Admin has no self-service My Profile page — account
                // editing for any user, including an admin's own, already
                // lives in User Management (see CLAUDE.md).
                myProfileHref={auth.role === 'admin' ? undefined : `/${auth.role}/my-profile`}
                settingsHref={`/${auth.role}/settings`}
                triggerClassName="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {auth.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={auth.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </ProfileMenu>
            </>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full bg-[#0b1b62] px-3 py-1.5 text-xs font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#08154d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e] sm:px-6 sm:py-2 sm:text-sm"
            >
              Log In
            </Link>
          )}

          <ThemeToggle className="text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10" />

          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#0b1b62] hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="border-t border-[#c6c5d2] bg-[#fbf8ff] px-4 py-4 dark:border-slate-700 dark:bg-slate-900 lg:hidden">
          {/* Enroll/Log In live in the persistent header bar now (visible at
              every width), so this drawer only needs the anchor nav links. */}
          <ul className="flex list-none flex-col gap-1 p-0 m-0">
            {navigationItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#454650] hover:bg-black/5 hover:text-[#0b1b62] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
