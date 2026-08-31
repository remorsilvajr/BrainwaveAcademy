'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2, User as UserIcon } from 'lucide-react'

// Vercel's serverless functions cap request bodies at 4.5MB regardless of
// this repo's own next.config.ts `experimental.serverActions.bodySizeLimit`
// (10mb) — that config only governs Next's own application-level check, not
// the platform's. An oversized photo (a phone-camera JPEG, or especially an
// uncompressed format like BMP) used to sail past this component with no
// feedback and hit that platform limit at the network layer instead, which
// doesn't come back as a normal thrown Error the Server Action's try/catch
// can show a friendly message for — it surfaces as a generic framework
// error ("An unexpected response was received from the server" or a
// minified React Server Components error) with no indication of the real
// cause. Rejecting oversized files here, before any upload is attempted,
// turns that into an immediate, friendly, catchable message instead.
const MAX_FILE_BYTES = 4 * 1024 * 1024

// Purely presentational + interactive - callers decide whether a picked
// file is uploaded immediately or staged until some outer "Save" (see
// components/parent/my-profile-form.tsx for the deferred pattern vs.
// components/parent/student-avatar-editor.tsx for immediate-upload).
export function AvatarEditor({
  imageUrl,
  onFileSelected,
  onRemove,
  disabled,
  sizeClassName = 'h-28 w-28',
}: {
  imageUrl: string | null
  onFileSelected: (file: File) => void
  onRemove?: () => void
  disabled?: boolean
  sizeClassName?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sizeError, setSizeError] = useState('')

  return (
    <div className="mx-auto w-max">
      <div className={`relative ${sizeClassName}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={`${sizeClassName} rounded-full object-cover`} />
        ) : (
          <span className={`flex ${sizeClassName} items-center justify-center rounded-full bg-sky-100 text-sky-700`}>
            <UserIcon className="h-1/2 w-1/2" />
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          aria-label="Change photo"
        >
          <Camera className="h-4 w-4" />
        </button>
        {onRemove && imageUrl && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow ring-1 ring-gray-200 hover:bg-red-50 disabled:opacity-60"
            aria-label="Remove photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              if (file.size > MAX_FILE_BYTES) {
                setSizeError('That photo is too large — please choose one under 4MB.')
              } else {
                setSizeError('')
                onFileSelected(file)
              }
            }
            e.target.value = ''
          }}
        />
      </div>
      {sizeError && (
        <p className="mt-1 max-w-[8rem] text-center text-xs text-red-600">{sizeError}</p>
      )}
    </div>
  )
}
