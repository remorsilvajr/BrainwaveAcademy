'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react'
import { verifyPickupCard, logPickupCheck, type ScannedPickup } from '@/app/teacher/pickup-verification/actions'
import { PickupAvatar } from '@/components/pickup/pickup-avatar'

// Pickup ID scanning for Pickup Verification. Two ways in: the camera (any laptop or
// phone), or the text box, which also takes a USB/Bluetooth barcode scanner because
// those type the code and press Enter. Everything is checked on the server
// (verifyPickupCard); the camera never leaves the browser.
export function PickupScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ error: string } | { person: ScannedPickup } | null>(null)
  const [logged, setLogged] = useState(false)

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const verify = useCallback(async (code: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setChecking(true)
    setLogged(false)
    try {
      setResult(await verifyPickupCard(code))
    } catch {
      setResult({ error: 'Something went wrong. Please try again.' })
    } finally {
      busyRef.current = false
      setChecking(false)
    }
  }, [])

  async function startCamera() {
    setCameraError('')
    setResult(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot use the camera here. Type or scan the code in the box below instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCameraOn(true)
      // The <video> element is rendered as soon as cameraOn flips; attach on next frame.
      requestAnimationFrame(() => {
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        void video.play().catch(() => {})
        frameRef.current = requestAnimationFrame(scanFrame)
      })

      // Looks at one video frame per animation frame until a code is found.
      function scanFrame() {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || !streamRef.current) return
        if (video.readyState === video.HAVE_ENOUGH_DATA && !busyRef.current) {
          const width = video.videoWidth
          const height = video.videoHeight
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (context) {
            context.drawImage(video, 0, 0, width, height)
            const found = jsQR(context.getImageData(0, 0, width, height).data, width, height)
            if (found?.data) {
              // One scan is enough: stop the camera and check the code.
              stopCamera()
              void verify(found.data)
              return
            }
          }
        }
        frameRef.current = requestAnimationFrame(scanFrame)
      }
    } catch {
      setCameraError('The camera could not be opened. Allow camera access for this site, or type or scan the code in the box below.')
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    setResult(null)
    void verify(code)
    setManualCode('')
  }

  async function handleLog(person: ScannedPickup) {
    const outcome = await logPickupCheck(person.studentId, person.name)
    if (!outcome?.error) setLogged(true)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <ScanLine className="h-4 w-4" />
            Scan Pickup ID
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Scan the QR on the person&apos;s card, then compare the photo with the person in front of you.
          </p>
        </div>
        <button
          type="button"
          onClick={cameraOn ? stopCamera : startCamera}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white dark:border-indigo-300 dark:text-indigo-300 dark:hover:bg-indigo-300 dark:hover:text-gray-900"
        >
          {cameraOn ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          {cameraOn ? 'Stop Camera' : 'Scan with Camera'}
        </button>
      </div>

      {cameraError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cameraError}</p>}

      {cameraOn && (
        <div className="mt-3 overflow-hidden rounded-lg bg-black sm:max-w-sm">
          <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Or type / scan the code (barcode scanner)"
          aria-label="Pickup ID code"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={checking || !manualCode.trim()}
          className="rounded-full bg-[#0b1b62] px-4 py-2 text-xs font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
        >
          Check
        </button>
      </form>

      {checking && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Checking the Pickup ID...</p>}

      {result && 'error' in result && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      {result && 'person' in result && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
          <div className="flex items-center gap-3">
            <PickupAvatar
              url={result.person.photoUrl}
              sizeClassName="h-20 w-20"
              iconClassName="h-7 w-7"
              fallbackClassName="bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
            />
            <div>
              <p className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-300">
                <ShieldCheck className="h-4 w-4" />
                {result.person.name}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {[result.person.relationship, result.person.phone].filter(Boolean).join(' · ') || 'Authorized on file'}
              </p>
              <p className="text-xs font-semibold text-green-800 dark:text-green-300">Authorized for {result.person.studentName}</p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">Compare this photo with the person in front of you.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleLog(result.person)}
            disabled={logged}
            className="shrink-0 rounded-full border border-green-600 dark:border-green-500 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logged ? 'Logged' : 'Log Check'}
          </button>
        </div>
      )}
    </div>
  )
}
