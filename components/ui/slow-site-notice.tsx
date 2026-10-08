'use client'

import { useSyncExternalStore } from 'react'
import { Clock, X } from 'lucide-react'

// A small heads-up shown in every portal after logging in: pages can be slow
// because the app runs on free hosting plans, and the server (Vercel, US) and
// the database (Supabase, Tokyo) are far apart, so each page's database calls
// cross the Pacific. Dismissed per browser session (sessionStorage), so it
// comes back on the next visit. Same useSyncExternalStore pattern as
// CookieConsentBanner (no hydration mismatch, no setState in an effect).
const STORAGE_KEY = 'slow_site_notice_dismissed'
const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return 'unavailable'
  }
}

function getServerSnapshot() {
  return 'ssr'
}

export function SlowSiteNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (dismissed !== null) return null

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Storage blocked: it just shows again on the next page.
    }
    for (const listener of listeners) listener()
  }

  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-8 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Pages may load slowly.</span> The portal runs on free hosting plans, and its server and
        database are in different countries, so a page can take a few seconds. Please wait for it to load instead of clicking again.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1.5 shrink-0 rounded p-1.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
