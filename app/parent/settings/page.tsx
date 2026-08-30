import { Lock, Bell, Laptop } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { NotificationSettings } from '@/components/parent/notification-settings'
import { SessionManagement } from '@/components/parent/session-management'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_notifications_enabled, sms_notifications_enabled')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Account Settings &amp; Security</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage security settings, password updates, notification preferences, and account
          session controls.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Lock className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900">Password &amp; Security</h2>
        </div>
        <div className="p-6">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Bell className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
        </div>
        <div className="px-6">
          <NotificationSettings
            emailEnabled={profile?.email_notifications_enabled ?? true}
            smsEnabled={profile?.sms_notifications_enabled ?? true}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Laptop className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900">Session Management</h2>
        </div>
        <div className="p-6">
          <SessionManagement lastSignInAt={user?.last_sign_in_at ?? null} />
        </div>
      </section>
    </div>
  )
}
