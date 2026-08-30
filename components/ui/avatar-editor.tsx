'use client'

import { useRef } from 'react'
import { Camera, Trash2, User as UserIcon } from 'lucide-react'

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

  return (
    <div className={`relative mx-auto ${sizeClassName}`}>
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
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
