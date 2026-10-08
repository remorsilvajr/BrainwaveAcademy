'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { setPhotoConsent } from '@/components/consent/actions'
import { photoConsentLabel } from '@/lib/photo-consent'
import type { ChildConsent } from '@/lib/photo-consent-load'

// One row per enrolled child: the current class-photo answer and two buttons to
// change it. Used in the parent's Settings and Photo Album.
export function PhotoConsentPanel({ students }: { students: ChildConsent[] }) {
  const router = useRouter()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startRefresh] = useTransition()

  async function choose(studentId: string, allowed: boolean) {
    setError('')
    setSavingId(studentId)
    try {
      const result = await setPhotoConsent(studentId, allowed)
      if (result?.error) {
        setError(result.error)
        return
      }
      startRefresh(() => router.refresh())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  if (students.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Once your child is enrolled, you can choose this here.</p>
  }

  return (
    <div className="space-y-3">
      {students.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
        >
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
            <p
              className={`text-xs ${
                s.consent === true
                  ? 'text-green-700 dark:text-green-400'
                  : s.consent === false
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {photoConsentLabel(s.consent)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => choose(s.id, true)}
              disabled={savingId !== null || s.consent === true}
              aria-pressed={s.consent === true}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-default ${
                s.consent === true
                  ? 'bg-green-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {savingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Allow
            </button>
            <button
              type="button"
              onClick={() => choose(s.id, false)}
              disabled={savingId !== null || s.consent === false}
              aria-pressed={s.consent === false}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-default ${
                s.consent === false
                  ? 'bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <CameraOff className="h-3.5 w-3.5" />
              Don&apos;t Allow
            </button>
          </div>
        </div>
      ))}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
    </div>
  )
}
