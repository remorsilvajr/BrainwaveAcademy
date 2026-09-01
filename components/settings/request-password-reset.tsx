'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { requestPasswordResetEmail } from './actions'

export function RequestPasswordReset() {
  const [confirming, setConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleConfirm() {
    setIsSubmitting(true)
    setMessage('')
    try {
      await requestPasswordResetEmail()
      setIsError(false)
      setMessage('A new password has been emailed to you. Use it to log in next time.')
      setConfirming(false)
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Forgot your current password?</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        We&apos;ll generate a new password and email it to you — your current password stops
        working as soon as you request this.
      </p>

      {confirming ? (
        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            This immediately changes your password. Make sure you can check your email right now.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#e6007e] py-2 text-xs font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
            >
              {isSubmitting ? 'Sending…' : 'Yes, Email Me a New Password'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-gray-50"
        >
          <Mail className="h-4 w-4" />
          Email Me a New Password
        </button>
      )}

      {message && (
        <p className={`mt-3 text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message}</p>
      )}
    </div>
  )
}
