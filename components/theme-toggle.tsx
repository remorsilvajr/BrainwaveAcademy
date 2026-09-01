'use client'

import { Moon, Sun } from 'lucide-react'

// Both icons always render — which one shows is driven purely by the
// dark: CSS variant, not conditional JSX. That avoids the hydration
// mismatch a useState-driven icon would have: by the time React hydrates,
// app/layout.tsx's inline script has already set (or not set) the "dark"
// class on <html>, so the CSS-only swap is correct on the very first
// paint with no flash, and never disagrees with what the server rendered.
export function ThemeToggle({ className = '' }: { className?: string }) {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Private browsing / storage blocked — the toggle still works for
      // this page view, it just won't be remembered next visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
    </button>
  )
}
