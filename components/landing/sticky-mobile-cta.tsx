'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

// A persistent mobile-only conversion prompt, since the header's own
// Enroll button scrolls out of view once a mobile visitor starts reading
// (the header isn't sticky on small screens the way the desktop nav is
// via lg: — see SiteHeader). Dismissible per-visit only (component state,
// no localStorage) — reappearing on the next visit is an accepted
// trade-off for keeping this simple.
export function StickyMobileCta({ href = '/enroll' }: { href?: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#c6c5d2] bg-[#fbf8ff] px-4 py-3 shadow-[0px_-2px_8px_#0000001a] dark:border-slate-700 dark:bg-slate-900 lg:hidden">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        Ready to enroll your child?
      </p>
      <Link
        href={href}
        className="shrink-0 rounded-full bg-[#e6007e] px-5 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e]"
      >
        Enroll Now
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[#454650] hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
