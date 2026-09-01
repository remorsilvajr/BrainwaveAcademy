'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Laptop } from 'lucide-react'
import { logout, logoutAllDevices } from '@/app/login/actions'

export function SessionManagement({ lastSignInAt }: { lastSignInAt: string | null }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState<'current' | 'all' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const signedInLabel = lastSignInAt
    ? new Date(lastSignInAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'recently'

  async function handleLogout(scope: 'current' | 'all') {
    setIsLoggingOut(scope)
    setErrorMessage('')
    try {
      if (scope === 'all') {
        await logoutAllDevices()
      } else {
        await logout()
      }
      router.push('/login')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoggingOut(null)
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Manage your active session. If you notice unfamiliar activity, sign out of all devices
        immediately.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 dark:bg-sky-950/30 p-4">
        <Laptop className="h-5 w-5 shrink-0 text-[#0b1b62] dark:text-indigo-300" />
        <div>
          <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Active Session: This Device</p>
          <p className="text-xs text-[#0b1b62]/70 dark:text-indigo-300/70">Signed in {signedInLabel} • Current Device</p>
        </div>
      </div>

      {errorMessage && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => handleLogout('current')}
          disabled={isLoggingOut !== null}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isLoggingOut === 'current' ? 'Logging out…' : 'Log Out'}
        </button>
        <button
          type="button"
          onClick={() => handleLogout('all')}
          disabled={isLoggingOut !== null}
          className="text-sm font-semibold text-gray-700 dark:text-gray-300 underline hover:text-gray-900 disabled:opacity-60"
        >
          {isLoggingOut === 'all' ? 'Logging out of all devices…' : 'Log Out of All Devices'}
        </button>
      </div>
    </div>
  )
}
