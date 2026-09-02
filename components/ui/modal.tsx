'use client'

import { type ReactNode } from 'react'

const maxWidthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const

// Shared centered-overlay shell for every admin record editor/reviewer,
// replacing the full-height right-side slideover pattern (2026-09-02,
// requested for visual consistency with User Management's Edit modal,
// which already used this centered style). Callers keep their own
// internal header/tabs/body/footer structure — this only owns the
// backdrop, centering, and the rounded/shadowed card frame, plus the
// max-height + flex-col that lets a caller's own scrollable body region
// (`flex-1 overflow-y-auto`) work the same way it did inside the old
// full-height panel.
export function Modal({
  onClose,
  maxWidth = 'md',
  children,
}: {
  onClose: () => void
  maxWidth?: keyof typeof maxWidthClasses
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex max-h-[90vh] w-full ${maxWidthClasses[maxWidth]} flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800`}
      >
        {children}
      </div>
    </div>
  )
}
