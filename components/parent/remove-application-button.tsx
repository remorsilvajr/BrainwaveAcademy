'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { hideRejectedApplication } from '@/app/parent/enrollment-status/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// Deliberately no redirect() inside the server action itself — this button
// calls it directly (not via a <form action>/useActionState), and per this
// project's own convention (see the Middleware/Server Action note in
// CLAUDE.md), redirect()'s thrown NEXT_REDIRECT signal is only safe to let
// propagate through a form-submission action, not a directly-awaited call
// wrapped in try/catch on the client — it would just land in the catch
// block below as a fake error. Navigation happens client-side instead,
// after the action resolves successfully.
export function RemoveApplicationButton({
  applicationId,
  studentName,
  applicationRef,
  redirectTo = '/parent/enrollment-status',
}: {
  applicationId: string
  // Optional, but pass these when available — the confirmation should name
  // the specific record it's about to hide, same as every other
  // consequential confirmation in this app (see the "confirmations need
  // proper design" convention in CLAUDE.md).
  studentName?: string
  applicationRef?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleRemove() {
    setError('')
    startTransition(async () => {
      try {
        await hideRejectedApplication(applicationId)
        router.push(redirectTo)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        setConfirming(false)
      }
    })
  }

  const who = studentName && applicationRef ? `${studentName}'s application (${applicationRef})` : 'This application'

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        Remove This Application
      </button>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title="Remove this application?"
          description={`${who} will be hidden from your portal.`}
          confirmLabel="Yes, Remove It"
          tone="danger"
          isPending={isPending}
          onConfirm={handleRemove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
