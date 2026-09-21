'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { requestPasswordResetEmail } from './actions'

export function RequestPasswordReset() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleRequest() {
    setIsSubmitting(true)
    setMessage('')
    try {
      const result = await requestPasswordResetEmail()
      if (result?.error) {
        setIsError(true)
        setMessage(result.error)
        return
      }
      setIsError(false)
      setMessage('A password reset link has been emailed to you. Your current password keeps working until you choose a new one.')
    } catch {
      setIsError(true)
      setMessage('Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Forgot your current password?</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        We&apos;ll email you a one-time link to choose a new password. Nothing changes and you stay signed in until you
        set a new one; when you do, every device signed in to this account is signed out.
      </p>

      <button
        type="button"
        onClick={handleRequest}
        disabled={isSubmitting}
        className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
      >
        <Mail className="h-4 w-4" />
        {isSubmitting ? 'Sending…' : 'Request Password Reset Link'}
      </button>

      {message && (
        <p className={`mt-3 text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message}</p>
      )}
    </div>
  )
}
