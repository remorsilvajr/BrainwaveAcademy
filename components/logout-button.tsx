'use client'

import { useState } from 'react'
import { logout } from '@/app/login/actions'
import { iconMap, type IconName } from './sidebar'

export function LogoutButton({ icon }: { icon?: IconName }) {
  const Icon = icon ? iconMap[icon] : undefined
  const [confirming, setConfirming] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleConfirmLogout() {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#c7cff0] hover:bg-white/10 hover:text-white"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        Log Out
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Log out?</h2>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;ll need to sign in again to access your account.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={isLoggingOut}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 rounded-lg bg-[#e6007e] py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
              >
                {isLoggingOut ? 'Logging out…' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
