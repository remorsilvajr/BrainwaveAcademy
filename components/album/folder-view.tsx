'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, X } from 'lucide-react'
import { deleteAlbumPhoto } from '@/components/album/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { AlbumPhoto } from '@/lib/album'

// A folder's photos as a tidy grid; clicking one opens a full-screen lightbox
// (arrow keys / swipe-free buttons, Escape to close). Delete is offered only on
// photos the server marked `canDelete`, and the server re-checks it anyway.
export function FolderView({ photos }: { photos: AlbumPhoto[] }) {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<AlbumPhoto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const open = openIndex !== null ? (photos[openIndex] ?? null) : null

  useEffect(() => {
    if (openIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (confirming) return
      if (e.key === 'Escape') setOpenIndex(null)
      else if (e.key === 'ArrowRight') setOpenIndex((i) => (i === null ? i : Math.min(i + 1, photos.length - 1)))
      else if (e.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? i : Math.max(i - 1, 0)))
    }
    document.addEventListener('keydown', onKey)
    // The page behind the lightbox shouldn't scroll while it's open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [openIndex, photos.length, confirming])

  async function handleConfirmDelete() {
    if (!confirming) return
    setIsDeleting(true)
    setError('')
    try {
      const result = await deleteAlbumPhoto(confirming.id)
      if (result?.error) {
        setError(result.error)
        setConfirming(null)
        return
      }
      setConfirming(null)
      setOpenIndex(null)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setConfirming(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo, index) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 shadow-sm dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open photo ${index + 1} of ${photos.length}`}
              className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e6007e]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </button>
            {photo.classroomName && (
              <span className="pointer-events-none absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {photo.classroomName}
              </span>
            )}
            {photo.canDelete && (
              <button
                type="button"
                onClick={() => setConfirming(photo)}
                aria-label="Delete photo"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-100 backdrop-blur transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setOpenIndex(null)}
        >
          <div className="flex items-center justify-between gap-3 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium">
              {(openIndex ?? 0) + 1} / {photos.length}
              {open.classroomName && <span className="ml-3 rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{open.classroomName}</span>}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={open.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Open original</span>
              </a>
              {open.canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirming(open)}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL */}
            <img
              src={open.url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {(openIndex ?? 0) > 0 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenIndex((i) => (i === null ? i : i - 1))
                }}
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {(openIndex ?? 0) < photos.length - 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenIndex((i) => (i === null ? i : i + 1))
                }}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this photo?"
          description="This photo will be removed from the album for everyone."
          confirmLabel="Yes, Delete"
          tone="danger"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
