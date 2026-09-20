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
}: {
  url: string | null
  sizeClassName: string
  iconClassName: string
  fallbackClassName: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (url && url !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset
      <img src={url} alt="" onError={() => setFailedUrl(url)} className={`${sizeClassName} rounded-full object-cover`} />
    )
  }
  return (
    <span className={`flex ${sizeClassName} items-center justify-center rounded-full ${fallbackClassName}`}>
      <UserIcon className={iconClassName} />
    </span>
  )
}
