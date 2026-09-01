'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Mail, ArrowLeft, Info } from 'lucide-react'
import { requestPasswordReset } from '@/app/forgot-password/actions'

// useFormStatus() only reports the parent <form>'s pending state from a
// component nested inside it, not from the component rendering the <form>
// tag itself — same reasoning as LoginSubmitButton in login-form.tsx. A
// manually-toggled useState around the async action (the previous approach
// here) doesn't reliably paint its intermediate state, since React's own
// action-pending tracking is what useFormStatus reads from.
function ForgotPasswordSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-lg bg-[#e6007e] py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62] disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Send Password Reset Link'}
    </button>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(formData: FormData) {
    await requestPasswordReset(formData)
    setSubmitted(true)
  }

  return (
    <div className="w-full max-w-[420px] rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
      <h1 className="text-center text-3xl font-bold text-[#0b1b62] dark:text-indigo-300">
        Forgot Your Password?
      </h1>
      <p className="mt-3 text-center text-base text-[#454650] dark:text-slate-300">
        No worries! Enter your registered parent email address below, and
        we&apos;ll send you a secure link to reset your account password.
      </p>

      {submitted ? (
        <p className="mt-6 rounded-lg bg-green-50 dark:bg-green-950/30 px-4 py-3 text-center text-sm text-green-700">
          If an account exists for {email}, a reset link is on its way —
          check the inbox.
        </p>
      ) : (
        <form action={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#454650] dark:text-slate-300" />
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2.5 pl-10 pr-3 text-base text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[#c6c5d280] dark:border-slate-700 bg-[#efedf4] dark:bg-slate-800/60 p-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#454650] dark:text-slate-300" />
            <p className="text-xs font-medium text-[#454650] dark:text-slate-300">
              Note: For security reasons, the reset link will expire after 15
              minutes.
            </p>
          </div>

          <ForgotPasswordSubmitButton />
        </form>
      )}

      <a
        href="/login"
        className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-[#002739] dark:text-slate-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Log In
      </a>
    </div>
  )
}
