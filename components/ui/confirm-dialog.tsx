'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

type Tone = 'danger' | 'neutral'

// Shared centered confirm dialog, built on top of Modal — replaces the
// small inline "Are you sure? Cancel / Yes, ___" text pattern (still used
// a couple of places for genuinely low-stakes toggles) for anything that
// destroys or hides real data: blocking an account, deleting an account or
// enrollment request. Added 2026-09-03 after the inline Block confirm was
// flagged live as not having "proper design" — see the Conventions note in
// CLAUDE.md this same change added: any confirmation for a real
// destructive action should look like this, not a bare inline text prompt.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  isPending = false,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: Tone
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const Icon = tone === 'danger' ? AlertTriangle : Info

  return (
    <Modal onClose={onCancel} maxWidth="md">
      <div className="p-6 text-center">
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            tone === 'danger'
              ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`flex-1 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60 ${
            tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#e6007e] hover:bg-[#c9006e]'
          }`}
        >
          {isPending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
