'use client'

import { X, ExternalLink } from 'lucide-react'

// Signed URLs from Supabase Storage preserve the original object path (and
// therefore its extension) before the `?token=...` query string, so this is
// a reliable enough way to tell an image from a PDF without needing the
// caller to separately track each document's mime type.
function isPdfUrl(url: string) {
  return /\.pdf$/i.test(url.split('?')[0])
}

// Shared across every "View Document" spot (parent Requirements, admin
// Student Record, admin Application Review) — previously each opened the
// signed URL in a new tab via window.open, which is slower to get back
// from and easy to lose track of. This shows the document inline instead,
// with "Open in new tab" kept as a secondary escape hatch for anyone who
// still wants it (e.g. to print, or if a PDF doesn't render well inline in
// their browser).
export function DocumentPreviewModal({
  url,
  title,
  onClose,
}: {
  url: string | null
  title?: string
  onClose: () => void
}) {
  if (!url) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="truncate pr-4 text-sm font-semibold text-gray-900">{title ?? 'Document'}</p>
          <div className="flex shrink-0 items-center gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-[#00a3e0] hover:underline"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 p-3">
          {isPdfUrl(url) ? (
            <iframe
              src={url}
              title={title ?? 'Document preview'}
              className="h-full min-h-[70vh] w-full rounded-lg border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={title ?? 'Document preview'}
              className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  )
}
