'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, X, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const passwordRequirements = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Includes at least one uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'special',
    label: 'Includes at least one number or special character',
    test: (password: string) => /[\d\W_]/.test(password),
  },
]

export function ResetPasswordForm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requirementStatus = useMemo(
    () => passwordRequirements.map((r) => ({ ...r, isMet: r.test(newPassword) })),
    [newPassword]
  )
  const isPasswordValid = requirementStatus.every((r) => r.isMet)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')

    if (!isPasswordValid) {
      setFormMessage('Please make sure your password meets all requirements.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormMessage('Your passwords do not match. Please try again.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsSubmitting(false)

    if (error) {
      setFormMessage(error.message)
      return
    }

    router.push(
      '/login?message=' +
        encodeURIComponent('Your password has been updated. You can now log in.')
    )
  }

  return (
    <div className="w-full max-w-[400px] rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-[0px_3px_9px_#0b1b620d]">
      <h1 className="text-center text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Set New Password</h1>
      <p className="mt-2 text-center text-sm text-[#454650] dark:text-slate-300">
        Your email has been verified. Please create a new password for your
        account.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setFormMessage('')
              }}
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2.5 pl-3 pr-10 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              aria-pressed={showNewPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454650] dark:text-slate-300"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setFormMessage('')
              }}
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2.5 pl-3 pr-10 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
              aria-pressed={showConfirmPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454650] dark:text-slate-300"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#c6c5d280] dark:border-slate-700 bg-[#f5f2f9] dark:bg-gray-900 p-3">
          <p className="text-xs font-medium text-[#454650] dark:text-slate-300">Password Requirements:</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {requirementStatus.map((r) => (
              <li key={r.id} className="flex items-center gap-1.5 text-xs text-[#454650] dark:text-slate-300">
                {r.isMet ? (
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                )}
                {r.label}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Update Password & Log In'}
          <Send className="h-4 w-4" />
        </button>

        <p
          role="status"
          aria-live="polite"
          className={formMessage ? 'text-center text-sm text-red-600 dark:text-red-400' : 'sr-only'}
        >
          {formMessage}
        </p>
      </form>

      <a href="/login" className="mt-4 block text-center text-xs font-medium text-[#454650] dark:text-slate-300 underline">
        Return to Login
      </a>
    </div>
  )
}
