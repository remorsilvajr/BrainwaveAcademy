import { Lock, Bell, Laptop, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { RequestPasswordReset } from '@/components/settings/request-password-reset'
import { NotificationSettings } from '@/components/parent/notification-settings'
import { SessionManagement } from '@/components/parent/session-management'
import { PhotoConsentPanel } from '@/components/consent/photo-consent-panel'
import { loadParentChildrenConsent } from '@/lib/photo-consent-load'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, childrenConsent] = await Promise.all([
    supabase
      .from('profiles')
      .select('email_notifications_enabled, sms_notifications_enabled')
      .eq('id', user?.id ?? '')
      .single(),
    user ? loadParentChildrenConsent(supabase, user.id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Account Settings &amp; Security</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage security settings, password updates, notification preferences, and account
          session controls.
        </p>
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

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <Bell className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h2>
        </div>
        <div className="px-6">
          <NotificationSettings
            emailEnabled={profile?.email_notifications_enabled ?? true}
            smsEnabled={profile?.sms_notifications_enabled ?? true}
          />
        </div>
      </section>

      <section id="photo-consent" className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <Camera className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Class Photos</h2>
        </div>
        <div className="space-y-3 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Teachers share photos of class activities in the Photo Album, where the parents of that class can see them. Choose
            whether each child may appear in those photos. Until you choose, teachers keep your child out of them.
          </p>
          <PhotoConsentPanel students={childrenConsent} />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <Laptop className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Session Management</h2>
        </div>
        <div className="p-6">
          <SessionManagement lastSignInAt={user?.last_sign_in_at ?? null} />
        </div>
      </section>
    </div>
  )
}
