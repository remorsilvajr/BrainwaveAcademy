'use client'

import { useState } from 'react'
import { updateNotificationPreferences } from '@/app/teacher/settings/actions'
import { Toggle } from '@/components/ui/toggle'

export function NotificationSettings({
  emailEnabled: initialEmailEnabled,
  smsEnabled: initialSmsEnabled,
}: {
  emailEnabled: boolean
  smsEnabled: boolean
}) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleToggle(field: 'email' | 'sms', value: boolean) {
    const nextEmail = field === 'email' ? value : emailEnabled
    const nextSms = field === 'sms' ? value : smsEnabled

    if (field === 'email') setEmailEnabled(value)
    else setSmsEnabled(value)

    setIsSaving(true)
    setErrorMessage('')
    try {
      await updateNotificationPreferences({
        email_notifications_enabled: nextEmail,
        sms_notifications_enabled: nextSms,
      })
    } catch (err) {
      if (field === 'email') setEmailEnabled(!value)
      else setSmsEnabled(!value)
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      <div className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email Notifications</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive daily summaries, announcements, and administrative updates via email.
          </p>
        </div>
        <Toggle
          checked={emailEnabled}
          onChange={(v) => handleToggle('email', v)}
          disabled={isSaving}
          label="Email notifications"
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">SMS Alerts</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get immediate text alerts for urgent announcements or emergency closures.
          </p>
        </div>
        <Toggle
          checked={smsEnabled}
          onChange={(v) => handleToggle('sms', v)}
          disabled={isSaving}
          label="SMS alerts"
        />
      </div>
      {errorMessage && <p className="pt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
    </div>
  )
}
