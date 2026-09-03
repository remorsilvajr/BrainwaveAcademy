'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, X, ImagePlus } from 'lucide-react'
import { submitFeedback } from '@/components/feedback/actions'
import { Modal } from '@/components/ui/modal'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // matches the bug-reports bucket's own file_size_limit

// Reachable from ProfileMenu, so this modal has no idea what page it was
// opened from (public site, admin/teacher/parent portal) — it only needs an
// authenticated user, enforced server-side in submitFeedback.
export function BugReportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets picking the exact same file again re-fire onChange
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage('Screenshot must be under 5MB.')
      return
    }
    setErrorMessage('')
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleRemoveImage() {
    setImage(null)
    setImagePreview(null)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const formData = new FormData()
      if (image) formData.set('image', image)
      await submitFeedback(subject, message, formData)
      setSent(true)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report a Bug</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6">
        {sent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 text-center">
            <p className="font-medium text-green-800">Thanks — your report was sent to the admin team.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Ran into something broken or confusing? Let us know what happened and where — the
              more specific, the faster we can fix it.
            </p>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Can't upload a document on the Requirements page"
              maxLength={150}
              className="mb-4 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              What happened?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="What were you trying to do, what happened instead, and on which page?"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />

            <label className="mb-1 mt-4 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Screenshot (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element -- a
                    local blob: object URL, not a Next-optimizable remote/static asset */}
                <img
                  src={imagePreview}
                  alt="Screenshot preview"
                  className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remove screenshot"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ImagePlus className="h-4 w-4" />
                Attach a screenshot
              </button>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WEBP, or GIF, up to 5MB.</p>

            {errorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
        {sent ? (
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Close
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="flex-1 rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? 'Sending…' : 'Send Report'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
