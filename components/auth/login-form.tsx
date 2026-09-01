'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { login } from '@/app/login/actions'

// useFormStatus() only reports the parent <form>'s pending state from a
// component nested inside it, not from the component rendering the <form>
// tag itself — hence the separate component rather than a hook call
// straight in LoginForm.
function LoginSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62] disabled:opacity-60"
    >
      {pending ? 'Logging in…' : 'Log In'}
    </button>
  )
}

export function LoginForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full max-w-[400px] rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-[#0b1b62] dark:text-indigo-300">Welcome Back</h1>
        <p className="mt-2 text-base text-[#454650] dark:text-slate-300">
          Sign in to access your parent or staff portal.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form action={login} className="flex flex-col gap-4">
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
              autoComplete="email"
              placeholder="Enter your email"
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2.5 pl-10 pr-3 text-base text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#454650] dark:text-slate-300" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2.5 pl-10 pr-10 text-base text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454650] dark:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pb-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[#454650] dark:text-slate-300">
            <input
              type="checkbox"
              name="remember-me"
              className="h-4 w-4 rounded border-slate-200 dark:border-slate-700 text-[#0b1b62] dark:text-indigo-300 focus:ring-[#00a3e0]"
            />
            Remember me
          </label>
          <a
            href="/forgot-password"
            className="text-xs font-medium text-[#00a3e0] dark:text-sky-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a3e0]"
          >
            Forgot Password?
          </a>
        </div>

        <LoginSubmitButton />
      </form>
    </div>
  )
}
