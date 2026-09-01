import { Lock } from 'lucide-react'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { RequestPasswordReset } from '@/components/settings/request-password-reset'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account security.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <Lock className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Password &amp; Security</h2>
        </div>
        <div className="space-y-6 p-6">
          <ChangePasswordForm />
          <RequestPasswordReset />
        </div>
      </section>
    </div>
  )
}
