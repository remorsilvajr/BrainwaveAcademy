'use client'

import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'

// A pickup person's photo, or a placeholder icon when there is none or the
// signed URL no longer loads (links expire, and a page left open past that
// would otherwise show a broken image where the identity photo should be).
export function PickupAvatar({
  url,
  sizeClassName,
  iconClassName,
  fallbackClassName,
  onClick,
}: {
  url: string | null
  sizeClassName: string
  iconClassName: string
  fallbackClassName: string
  // Makes the photo a button (opens the pickup card with the larger photo).
  onClick?: () => void
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const visual =
    url && url !== failedUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset
      <img src={url} alt="" onError={() => setFailedUrl(url)} className={`${sizeClassName} rounded-full object-cover`} />
    ) : (
      <span className={`flex ${sizeClassName} items-center justify-center rounded-full ${fallbackClassName}`}>
        <UserIcon className={iconClassName} />
      </span>
    )

  if (!onClick) return visual
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="View pickup card"
      title="View pickup card"
      className="shrink-0 rounded-full transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
    >
      {visual}
    </button>
  )
}
