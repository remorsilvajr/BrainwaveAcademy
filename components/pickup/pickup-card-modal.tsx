'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Printer, X, User as UserIcon } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { pickupDisplayName, type PickupNameParts } from '@/lib/pickup-names'

export type PickupCardPerson = PickupNameParts & {
  relationship: string | null
  phone_number: string | null
  photoUrl: string | null
  idCode: string
  idLabel: string
}

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #pickup-card, #pickup-card * { visibility: visible !important; }
  #pickup-card { position: fixed; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 1px solid #999 !important; }
}`

// The "View Card" for an authorized pickup person: a large photo, full name,
// relationship, the child they may collect, and a QR Pickup ID that staff can scan
// in Pickup Verification. Printable on its own (the rest of the page is hidden while
// printing). The photo is only ever shown to the parent who registered it and to staff.
export function PickupCardModal({
  person,
  studentName,
  onClose,
}: {
  person: PickupCardPerson
  studentName: string
  onClose: () => void
}) {
  const [qr, setQr] = useState<string | null>(null)
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(person.idCode, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch(() => {
        if (!cancelled) setQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [person.idCode])

  return (
    <Modal onClose={onClose} maxWidth="md">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3 print:hidden">
        <h2 className="text-base font-bold text-[#0b1b62] dark:text-indigo-300">Authorized Pickup Card</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-5">
        <div id="pickup-card" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="bg-[#0b1b62] px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-white">
            Brainwave Preschool Academy - Authorized Pickup
          </div>
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start">
            <div className="h-44 w-36 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {person.photoUrl && !photoFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset
                <img
                  src={person.photoUrl}
                  alt={`Photo of ${pickupDisplayName(person)}`}
                  onError={() => setPhotoFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500">
                  <UserIcon className="h-10 w-10" />
                  <span className="text-xs">No photo on file</span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xl font-extrabold leading-tight text-gray-900 dark:text-gray-100">{pickupDisplayName(person)}</p>
              {person.relationship && <p className="text-sm text-gray-600 dark:text-gray-300">{person.relationship}</p>}
              {person.phone_number && <p className="text-sm text-gray-600 dark:text-gray-300">{person.phone_number}</p>}
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">May pick up</p>
                <p className="text-sm font-bold text-[#0b1b62] dark:text-indigo-300">{studentName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pickup ID</p>
              <p className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-gray-100">{person.idLabel}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Show this card at pickup. Staff scan the code and compare the photo.</p>
            </div>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL
              <img src={qr} alt="Pickup ID QR code" className="h-28 w-28 shrink-0 rounded bg-white p-1" />
            ) : (
              <span className="h-28 w-28 shrink-0 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d]"
          >
            <Printer className="h-4 w-4" />
            Print Card
          </button>
        </div>
      </div>
    </Modal>
  )
}
