import { SiteHeader } from '@/components/landing/site-header'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <ResetPasswordForm />
      </main>
    </div>
  )
}
