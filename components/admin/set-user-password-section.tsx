'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { setUserPassword } from '@/app/admin/user-management/actions'
import { PasswordFields } from '@/components/ui/password-fields'

// Shown in the Edit User modal only when the server says this viewer may set the
// password (see app/admin/user-management/page.tsx). The server action checks again.
// The typed passwords live in state just long enough to submit and are cleared right
// after, success or not.
export function SetUserPasswordSection({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setError('')
    setIsSubmitting(true)
    try {
      const result = await setUserPassword(userId, password, confirm)
      if (result?.error) {
        setError(result.error)
        return
      }
      setDone(true)
      setOpen(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPassword('')
      setConfirm('')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
      <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Password</p>

      {done && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Password updated. {name} was signed out on every device and has been notified by email. Give them the new
          password directly; it is not emailed.
        </p>
      )}

      {open ? (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose a new password for {name}. It follows the same rules as any password, is never emailed or shown again,
            and signs them out everywhere.
          </p>
          <PasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            required={false}
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPassword('')
                setConfirm('')
                setError('')
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !password || !confirm}
              className="flex-1 rounded-lg bg-[#e6007e] py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Set Password'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setDone(false)
          }}
          className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0b1b62] hover:bg-gray-50 dark:border-slate-700 dark:text-indigo-300 dark:hover:bg-gray-800"
        >
          <KeyRound className="h-4 w-4" />
          Set a New Password
        </button>
      )}
    </div>
  )
}
