import type { Metadata } from 'next'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Set Your Password',
  robots: { index: false, follow: false },
}

// Landing page for the link in a "set your password" email. It deliberately does
// nothing on its own: the one-time token is only used when the person presses the
// button (a POST to /auth/confirm), so an email scanner or link preview that just
// opens this URL cannot spend it.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash, type } = await searchParams
  const valid = !!token_hash && type === 'recovery'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf8ff] px-4 dark:bg-gray-950">
      <div className="w-full max-w-[400px] rounded-xl border border-[#c6c5d2] bg-white p-8 text-center shadow-[0px_3px_9px_#0b1b620d] dark:border-slate-700 dark:bg-gray-900">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
          <KeyRound className="h-6 w-6" />
        </span>
        {valid ? (
          <>
            <h1 className="mt-4 text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Set your password</h1>
            <p className="mt-2 text-sm text-[#454650] dark:text-slate-300">
              Press the button to continue and choose your own password. Nobody at the school will ever see it.
            </p>
            <form method="post" action="/auth/confirm" className="mt-6">
              <input type="hidden" name="token_hash" value={token_hash} />
              <input type="hidden" name="type" value="recovery" />
              <input type="hidden" name="next" value="/reset-password" />
              <button
                type="submit"
                className="w-full rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e]"
              >
                Continue
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-[#454650] dark:text-slate-300">
              It may be incomplete or already used. You can request a new one from the login page.
            </p>
            <Link href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-[#00a3e0] hover:underline dark:text-sky-400">
              Get a new link
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
