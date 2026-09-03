'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'cookie_consent'

// useSyncExternalStore rather than useState+useEffect: the server has no
// localStorage to read at all, and the real client value can legitimately
// differ from whatever we'd guess server-side — useSyncExternalStore is
// React's own mechanism for exactly that (render a fixed server snapshot,
// then correct to the real client value right after mount, with no
// hydration-mismatch warning). It also sidesteps calling setState
// synchronously inside an effect body, which this project's lint config
// (eslint-plugin-react-hooks' set-state-in-effect rule) flags.
const listeners = new Set<() => void>()

// Nothing external ever changes this store on its own — the only writer is
// dismiss() below, which calls emitChange() itself right after the write.
function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing / storage blocked — treat as "already acknowledged"
    // so a visitor who can't persist consent isn't shown a banner they can
    // never permanently dismiss.
    return 'unavailable'
  }
}

function getServerSnapshot() {
  return 'ssr'
}

function emitChange() {
  for (const listener of listeners) listener()
}

// Every cookie this app sets (auth session, remember_me, user_role,
// account_status, presence_ping) is strictly necessary for the Service to
// function — none are advertising/tracking cookies, so there's nothing to
// meaningfully "decline" (declining would just break login). This banner is
// therefore a notice-and-acknowledge pattern, not an accept/reject gate: it
// doesn't block or delay any cookie from being set either way, it just
// records that the visitor has seen the notice so it stops showing.
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const visible = consent === null

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'acknowledged')
    } catch {
      // Ignore — worst case the banner reappears next visit.
    }
    emitChange()
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#c6c5d2] bg-white/95 px-4 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-screen-xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-6 text-[#454650] dark:text-slate-300">
          We use cookies that are strictly necessary to run this site — keeping you logged in,
          remembering your preferences, and routing you to the right portal. We don&apos;t use
          cookies for advertising. See our{' '}
          <a href="/privacy-policy#cookies" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
            Cookie &amp; Privacy Policy
          </a>{' '}
          for details.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 whitespace-nowrap rounded-full bg-[#0b1b62] px-5 py-2 text-sm font-semibold text-white hover:bg-[#08154d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e]"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
