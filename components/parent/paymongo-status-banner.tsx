'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Shown after a parent returns from PayMongo's hosted checkout. The fee
// itself is only marked paid once the webhook lands (app/api/webhooks/
// paymongo/route.ts), which can take a couple of seconds after the browser
// redirect back here, so this does one delayed refresh rather than assuming
// the page's server-rendered data is already current.
export function PaymongoStatusBanner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('paymongo')

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.refresh(), 3000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        Payment received. Confirming with the school now, this can take a few seconds, refresh if the fee still shows as unpaid.
      </div>
    )
  }
  if (status === 'cancelled') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Online payment was cancelled. No charge was made.
      </div>
    )
  }
  return null
}
