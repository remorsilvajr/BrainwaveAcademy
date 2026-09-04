import type { Metadata } from 'next'
import { SiteHeader } from '@/components/landing/site-header'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

// Only ever reached via a one-time emailed token — nothing to index and
// nobody should land here from a search result.
export const metadata: Metadata = {
  title: 'Reset Password | Brainwave Preschool Academy',
  description: 'Set a new password for your Brainwave Preschool Academy portal account.',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <ResetPasswordForm />
      </main>
    </div>
  )
}
