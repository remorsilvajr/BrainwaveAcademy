'use client'

import { ShieldCheck } from 'lucide-react'
import { PickupAvatar } from '@/components/pickup/pickup-avatar'

// The green "authorized" result in Pickup Verification, for a scanned card and for a
// name match. On a phone the photo and details share the top and the Record Pickup
// button goes full width underneath: in one row the button sat on top of the text.
export function PickupMatchCard({
  photoUrl,
  name,
  details,
  studentName,
  note,
  large = false,
  onPhotoClick,
  buttonLabel,
  buttonDisabled,
  onButtonClick,
}: {
  photoUrl: string | null
  name: string
  details: string
  studentName: string
  note?: string
  // The scanner shows a bigger photo, since comparing it is the whole point.
  large?: boolean
  onPhotoClick?: () => void
  buttonLabel: string
  buttonDisabled: boolean
  onButtonClick: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <PickupAvatar
          url={photoUrl}
          sizeClassName={large ? 'h-20 w-20 shrink-0' : 'h-12 w-12 shrink-0'}
          iconClassName={large ? 'h-7 w-7' : 'h-5 w-5'}
          fallbackClassName="bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
          onClick={onPhotoClick}
        />
        <div className="min-w-0">
          <p className="flex items-start gap-1.5 font-medium text-green-800 dark:text-green-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{name}</span>
          </p>
          <p className="break-words text-xs text-green-700 dark:text-green-400">{details}</p>
          <p className="break-words text-xs font-semibold text-green-800 dark:text-green-300">{`Authorized for ${studentName}`}</p>
          {note && <p className="mt-1 text-xs text-green-700 dark:text-green-400">{note}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onButtonClick}
        disabled={buttonDisabled}
        className="w-full shrink-0 rounded-full border border-green-600 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-500 dark:text-green-400 sm:w-auto sm:py-1.5"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
