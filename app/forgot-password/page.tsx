import type { Metadata } from 'next'
import { SiteHeader } from '@/components/landing/site-header'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password | Brainwave Preschool Academy',
  description: 'Request a password reset link for your Brainwave Preschool Academy portal account.',
  robots: { index: false, follow: true },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white dark:bg-gray-950">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <ForgotPasswordForm />
      </main>
    </div>
  )
}
