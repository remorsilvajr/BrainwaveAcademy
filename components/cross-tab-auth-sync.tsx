'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Session cookies are shared across every tab in the same browser, but a
// tab's already-rendered page has no way to know when another tab changes
// that shared state — logging in or out elsewhere leaves this tab showing
// stale content (e.g. still "logged in as admin" after logging out of that
// same account in another tab) until something makes it talk to the server
// again. Refreshing whenever a tab regains visibility is the simplest
// reliable fix: it re-runs the current route's Server Components — and
// middleware, which redirects appropriately if the role or session no
// longer matches what this tab was showing — using whatever the cookies
// actually say right now, not what they said when this tab last loaded.
export function CrossTabAuthSync() {
  const router = useRouter()

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])

  return null
}
