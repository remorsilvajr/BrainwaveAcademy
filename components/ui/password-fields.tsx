'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { passwordRequirements } from '@/lib/password-rules'

// Two password inputs (type it twice) with the live rules and a match indicator. The
// values live in the parent form's state. The visible inputs have no `name`: what is
// submitted is a pair of hidden inputs mirroring that state, so a form reset after a
// failed submit (React resets forms when an action finishes) can never blank what was
// typed, and `resetKey` remounts the visible inputs after each server response so they
// show it again. Nothing here stores or logs the values. The checklist is a hint only:
// the Server Action applies the real rules (lib/password.ts), including common and
// breached passwords.
export function PasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  onPasswordBlur,
  onConfirmBlur,
  required,
  passwordError,
  confirmError,
  resetKey = 0,
}: {
  password: string
  confirm: string
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  // Optional: fired when the person leaves each input, so a form can check it early.
  onPasswordBlur?: () => void
  onConfirmBlur?: () => void
  required: boolean
  passwordError?: string
  confirmError?: string
  // Change it to remount the visible inputs (see above).
  resetKey?: number
}) {
  const [show, setShow] = useState(false)
  const met = passwordRequirements.map((r) => ({ ...r, isMet: r.test(password) }))
  const matches = confirm.length > 0 && password === confirm

  const inputClass = (error?: string) =>
    `w-full rounded-lg border py-2.5 pl-3 pr-10 text-sm text-gray-700 dark:text-gray-300 dark:bg-transparent focus:outline-none ${
      error
        ? 'border-red-400 focus:border-red-500'
        : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
    }`

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
          Password{required && <span className="text-red-500"> *</span>}
        </label>
        <div className="relative">
          <input type="hidden" name="password" value={password} />
          <input
            key={`password-${resetKey}`}
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onBlur={onPasswordBlur}
            required={required}
            className={inputClass(passwordError)}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
            aria-pressed={show}
            className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#454650] dark:text-slate-300"
          >
            {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        {passwordError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
          Confirm Password{required && <span className="text-red-500"> *</span>}
        </label>
        <input type="hidden" name="confirm_password" value={confirm} />
        <input
          key={`confirm-${resetKey}`}
          id="confirm_password"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          onBlur={onConfirmBlur}
          required={required}
          className={inputClass(confirmError)}
        />
        {confirmError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{confirmError}</p>}
        {!confirmError && confirm.length > 0 && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${matches ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {matches ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {matches ? 'Passwords match' : 'Passwords do not match yet'}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-[#c6c5d280] bg-[#f5f2f9] p-3 dark:border-slate-700 dark:bg-gray-900">
        <p className="text-xs font-medium text-[#454650] dark:text-slate-300">Your password needs:</p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {met.map((r) => (
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
    </div>
  )
}
