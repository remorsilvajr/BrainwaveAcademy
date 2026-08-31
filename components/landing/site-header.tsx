'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const navigationItems = [
  { label: 'About Us', href: '/#about-us' },
  { label: 'Programs', href: '/#programs' },
  { label: '6 Domains', href: '/#domains' },
]

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#c6c5d2] bg-[#fbf8ff] shadow-[0px_1px_2px_#0000000d]">
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
                className="text-sm font-semibold tracking-[0.14px] text-[#454650] hover:text-[#0b1b62] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 justify-self-end lg:flex">
          <a
            href="/enroll"
            className="rounded-full bg-[#e6007e] px-6 py-2 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
          >
            Enroll
          </a>
          <a
            href="/login"
            className="rounded-full bg-[#0b1b62] px-6 py-2 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#08154d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e]"
          >
            Log In
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#0b1b62] hover:bg-black/5 lg:hidden"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {isMenuOpen && (
        <div className="border-t border-[#c6c5d2] bg-[#fbf8ff] px-4 py-4 lg:hidden">
          <ul className="flex list-none flex-col gap-1 p-0 m-0">
            {navigationItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#454650] hover:bg-black/5 hover:text-[#0b1b62]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-[#c6c5d2] pt-3">
            <a
              href="/enroll"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-full bg-[#e6007e] px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#c9006e]"
            >
              Enroll
            </a>
            <a
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-full bg-[#0b1b62] px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#08154d]"
            >
              Log In
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
