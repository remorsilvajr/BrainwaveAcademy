'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { recordAlbumPhotos } from '@/components/album/actions'
import { ALBUM_BUCKET, ALBUM_MAX_PHOTOS_PER_UPLOAD, formatAlbumDate } from '@/lib/album'
import { todayIso } from '@/lib/format'

const MAX_INPUT_BYTES = 25 * 1024 * 1024 // a raw phone photo; it's resized below before upload
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82
const CONCURRENCY = 3

type Picked = { id: string; file: File; preview: string }

// Phone photos are often 4-8MB and a Server Action body is capped at 4.5MB, so
// each photo is scaled down and re-encoded in the browser (also applying its
// EXIF rotation) and uploaded straight to Storage; only the resulting paths go
// to the server. That keeps a whole batch fast and each file a few hundred KB.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('could not encode image')
  return blob
}

export function UploadPanel({ classrooms }: { classrooms: { id: string; name: string }[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  // A teacher with exactly one class doesn't need to pick; otherwise they must.
  const [classroomId, setClassroomId] = useState(classrooms.length === 1 ? classrooms[0].id : '')
  const [dragging, setDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [doneCount, setDoneCount] = useState<number | null>(null)

  // Object URLs for the previews are released when the selection changes or the
  // panel unmounts.
  const pickedRef = useRef<Picked[]>([])
  useEffect(() => {
    pickedRef.current = picked
  }, [picked])
  useEffect(() => {
    return () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.preview))
  }, [])

  const today = todayIso()

  function addFiles(files: FileList | File[]) {
    setError('')
    setDoneCount(null)
    const incoming = Array.from(files)
    const images = incoming.filter((f) => f.type.startsWith('image/'))
    let message = ''
    if (images.length < incoming.length) message = 'Only image files can be added.'

    const accepted: Picked[] = []
    for (const file of images) {
      if (file.size > MAX_INPUT_BYTES) {
        message = `${file.name} is over 25MB and was skipped.`
        continue
      }
      accepted.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })
    }

    const room = ALBUM_MAX_PHOTOS_PER_UPLOAD - picked.length
    if (accepted.length > room) {
      accepted.slice(room).forEach((p) => URL.revokeObjectURL(p.preview))
      message = `You can add up to ${ALBUM_MAX_PHOTOS_PER_UPLOAD} photos at a time.`
    }
    setPicked((current) => [...current, ...accepted.slice(0, Math.max(room, 0))])
    if (message) setError(message)
  }

  function removePicked(id: string) {
    setPicked((current) => {
      const target = current.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((p) => p.id !== id)
    })
  }

  async function handleUpload() {
    if (picked.length === 0 || isUploading) return
    if (!classroomId) {
      setError('Choose which class these photos are for.')
      return
    }
    setError('')
    setDoneCount(null)
    setIsUploading(true)
    setProgress(0)

    const uploadedPaths: string[] = []
    let failed = 0
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Your session has expired. Please log in again.')
        return
      }

      const queue = [...picked]
      async function worker() {
        for (let next = queue.shift(); next; next = queue.shift()) {
          try {
            const blob = await shrink(next.file)
            const path = `${user!.id}/${crypto.randomUUID()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from(ALBUM_BUCKET)
              .upload(path, blob, { contentType: 'image/jpeg' })
            if (uploadError) throw uploadError
            uploadedPaths.push(path)
          } catch {
            failed += 1
          }
          setProgress((p) => p + 1)
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, picked.length) }, worker))

      if (uploadedPaths.length === 0) {
        setError('None of the photos could be uploaded. Please try again.')
        return
      }

      const result = await recordAlbumPhotos(uploadedPaths, classroomId)
      if ('error' in result) {
        // Nothing was recorded, so don't leave the just-uploaded files orphaned.
        await supabase.storage.from(ALBUM_BUCKET).remove(uploadedPaths)
        setError(result.error)
        return
      }

      picked.forEach((p) => URL.revokeObjectURL(p.preview))
      setPicked([])
      setDoneCount(result.count)
      if (failed > 0) setError(`${failed} photo${failed === 1 ? '' : 's'} couldn't be uploaded. You can add ${failed === 1 ? 'it' : 'them'} again.`)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="bg-[#0b1b62] px-6 py-4 text-white">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <UploadCloud className="h-5 w-5" />
          Add photos
        </h2>
        <p className="mt-0.5 text-sm text-white/85">
          They go into today&apos;s folder, {formatAlbumDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}. The
          folder is created when you upload, so days without photos have none.
        </p>
      </div>

      {classrooms.length === 0 ? (
        <p className="m-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          You aren&apos;t assigned to a class yet, so you can&apos;t add photos. Ask an admin to assign you as a lead or
          assistant teacher of a class.
        </p>
      ) : (
      <div className="space-y-4 p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (!isUploading) addFiles(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragging
              ? 'border-[#e6007e] bg-pink-50 dark:bg-pink-950/20'
              : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/40'
          }`}
        >
          <ImagePlus className="h-9 w-9 text-[#0b1b62] dark:text-indigo-300" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag photos here, or</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="rounded-full bg-[#0b1b62] px-5 py-2 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
          >
            Choose photos
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            JPG, PNG or WEBP, up to {ALBUM_MAX_PHOTOS_PER_UPLOAD} at a time. Large photos are resized automatically.
          </p>
        </div>

        {picked.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              {picked.length} photo{picked.length === 1 ? '' : 's'} ready
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {picked.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, not a Next-optimizable asset */}
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removePicked(p.id)}
                      aria-label={`Remove ${p.file.name}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="album-classroom" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              id="album-classroom"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              disabled={isUploading}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              {classrooms.length !== 1 && <option value="">Choose a class</option>}
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={picked.length === 0 || !classroomId || isUploading}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#e6007e] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {Math.min(progress, picked.length)}/{picked.length}
              </>
            ) : (
              <>Upload {picked.length > 0 ? picked.length : ''} to today&apos;s folder</>
            )}
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>
        )}
        {doneCount !== null && (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {doneCount} photo{doneCount === 1 ? '' : 's'} added to today&apos;s folder.
            <Link href={`/teacher/album/${today}`} className="font-semibold underline">
              Open it
            </Link>
          </p>
        )}
      </div>
      )}
    </section>
  )
}
