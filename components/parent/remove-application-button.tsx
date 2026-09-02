'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { hideRejectedApplication } from '@/app/parent/enrollment-status/actions'

// Deliberately no redirect() inside the server action itself — this button
// calls it directly (not via a <form action>/useActionState), and per this
// project's own convention (see the Middleware/Server Action note in
// CLAUDE.md), redirect()'s thrown NEXT_REDIRECT signal is only safe to let
// propagate through a form-submission action, not a directly-awaited call
// wrapped in try/catch on the client — it would just land in the catch
// block below as a fake error. Navigation happens client-side instead,
// after the action resolves successfully.
export function RemoveApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleRemove() {
    setError('')
    startTransition(async () => {
      try {
        await hideRejectedApplication(applicationId)
        router.push('/parent/enrollment-status')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          Remove this application from your portal? It stays on file with the school.
        </span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="font-semibold text-gray-500 dark:text-gray-400 underline disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="font-semibold text-red-700 dark:text-red-400 underline disabled:opacity-60"
        >
          {isPending ? 'Removing…' : 'Yes, Remove It'}
        </button>
        {error && <p className="w-full text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-semibold text-red-700 dark:text-red-400 hover:underline"
    >
      Remove This Application
    </button>
  )
}
