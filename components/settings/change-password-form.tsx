'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

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

    if (newPassword.length < 8) {
      setIsError(true)
      setMessage('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setIsError(true)
      setMessage('Passwords do not match.')
      return
    }
    if (!currentPassword) {
      setIsError(true)
      setMessage('Enter your current password.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      setIsSubmitting(false)
      setIsError(true)
      setMessage('Your session has expired. Please log in again.')
      return
    }

    // Verifies the current password is actually correct before allowing a
    // change, rather than letting anyone with an unlocked, still-logged-in
    // session change the password outright.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (reauthError) {
      setIsSubmitting(false)
      setIsError(true)
      setMessage('Current password is incorrect.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsSubmitting(false)

    if (error) {
      setIsError(true)
      setMessage(error.message)
      return
    }

    setIsError(false)
    setMessage('Password updated successfully.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
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
        <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
      )}
    </form>
  )
}
