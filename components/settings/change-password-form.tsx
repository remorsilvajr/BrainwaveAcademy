'use client'

import { useState, type FormEvent } from 'react'
import { changePassword } from './actions'

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    // Quick, friendly checks only; the server enforces every rule again
    // (changePassword in ./actions).
    if (!currentPassword) {
      setIsError(true)
      setMessage('Enter your current password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setIsError(true)
      setMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword)
      if (result?.error) {
        setIsError(true)
        setMessage(result.error)
        return
      }
      setIsError(false)
      setMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setIsError(true)
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Current Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          At least 8 characters, with an uppercase letter and a number or special character. Not your name or email.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Confirm New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[#00a3e0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0090c7] disabled:opacity-60"
      >
        {isSubmitting ? 'Updating…' : 'Update Password'}
      </button>

      {message && (
        <p className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message}</p>
      )}
    </form>
  )
}
