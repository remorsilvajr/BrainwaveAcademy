'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ChangePasswordForm() {
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

    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsSubmitting(false)

    if (error) {
      setIsError(true)
      setMessage(error.message)
      return
    }

    setIsError(false)
    setMessage('Password updated successfully.')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className="block text-sm mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-60"
      >
        {isSubmitting ? 'Updating…' : 'Change Password'}
      </button>

      {message && (
        <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
      )}
    </form>
  )
}
