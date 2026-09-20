'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { User as UserIcon, Plus, X, ImagePlus, Loader2 } from 'lucide-react'
import {
  addPickupPerson,
  updatePickupPerson,
  removePickupPerson,
  removePickupPersonPhoto,
  type PickupPersonInput,
} from '@/app/parent/pickup/actions'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

type Student = { id: string; first_name: string; last_name: string }
type Pickup = {
  id: string
  student_id: string
  full_name: string
  relationship: string | null
  phone_number: string | null
  id_type: string | null
  id_number: string | null
  photoUrl: string | null
}

const emptyInput: PickupPersonInput = { fullName: '', relationship: '', phoneNumber: '', idType: '', idNumber: '' }

function PickupFormModal({
  studentId,
  editing,
  onClose,
}: {
  studentId: string
  editing: Pickup | null
  onClose: () => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState<PickupPersonInput>(
    editing
      ? {
          fullName: editing.full_name,
          relationship: editing.relationship ?? '',
          phoneNumber: editing.phone_number ?? '',
          idType: editing.id_type ?? '',
          idNumber: editing.id_number ?? '',
        }
      : emptyInput
  )
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(editing?.photoUrl ?? null)
  const [removingExistingPhoto, setRemovingExistingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()
  const [error, setError] = useState('')

  // The save itself is only half the wait: router.refresh() re-renders the
  // whole page server-side before the new person shows up in the list. Keep
  // the modal (and its spinner) up until that refresh has actually landed,
  // instead of closing it immediately and leaving the parent looking at an
  // unchanged list for several silent seconds.
  useEffect(() => {
    if (saved && !isRefreshing) onClose()
  }, [saved, isRefreshing, onClose])

  const busy = isSaving || saved

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be under 2MB.')
      return
    }
    setError('')
    setPhoto(file)
    setRemovingExistingPhoto(false)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleRemovePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (editing?.photoUrl) setRemovingExistingPhoto(true)
  }

  async function handleSubmit() {
    setIsSaving(true)
    setError('')
    try {
      const formData = new FormData()
      if (photo) formData.set('photo', photo)

      if (editing) {
        if (removingExistingPhoto) {
          const removeResult = await removePickupPersonPhoto(editing.id)
          if (removeResult?.error) {
            setError(removeResult.error)
            return
          }
        }
        const result = await updatePickupPerson(editing.id, input, formData)
        if (result?.error) {
          setError(result.error)
          return
        }
      } else {
        const result = await addPickupPerson(studentId, input, formData)
        if ('error' in result) {
          setError(result.error)
          return
        }
      }
      setSaved(true)
      startRefresh(() => {
        router.refresh()
      })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={busy ? () => {} : onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {editing ? 'Edit Authorized Pickup Person' : 'Add Authorized Pickup Person'}
        </h2>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 p-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Full Name</label>
          <input
            value={input.fullName}
            onChange={(e) => setInput({ ...input, fullName: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Relationship to Child</label>
            <input
              value={input.relationship}
              onChange={(e) => setInput({ ...input, relationship: e.target.value })}
              placeholder="e.g. Grandmother, Uncle, Family Driver"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Contact Number</label>
            <input
              value={input.phoneNumber}
              onChange={(e) => setInput({ ...input, phoneNumber: e.target.value })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">ID Type</label>
            <input
              value={input.idType}
              onChange={(e) => setInput({ ...input, idType: e.target.value })}
              placeholder="e.g. Driver's License"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">ID Number</label>
            <input
              value={input.idNumber}
              onChange={(e) => setInput({ ...input, idNumber: e.target.value })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Photo</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          {photoPreview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview or a freshly-signed remote URL, not a Next-optimizable static asset */}
              <img
                src={photoPreview}
                alt="Pickup person"
                className="h-20 w-20 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                aria-label="Remove photo"
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700"
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
              Add a photo
            </button>
          )}
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            JPG, PNG, or WEBP, up to 2MB. Helps staff confirm identity at pickup.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {busy && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-sm text-sky-700 dark:text-sky-300"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {isSaving
              ? photo
                ? 'Uploading the photo and saving. This can take a few seconds.'
                : 'Saving. This can take a few seconds.'
              : 'Saved. Updating the list…'}
          </p>
        )}
      </div>

      <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy || !input.fullName.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save Changes' : 'Add Person'}
        </button>
      </div>
    </Modal>
  )
}

export function AuthorizedPickupManager({ students, pickups }: { students: Student[]; pickups: Pickup[] }) {
  const router = useRouter()
  const [formFor, setFormFor] = useState<{ studentId: string; editing: Pickup | null } | null>(null)
  const [removing, setRemoving] = useState<Pickup | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmRemove() {
    if (!removing) return
    setIsRemoving(true)
    setError('')
    try {
      const result = await removePickupPerson(removing.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setRemoving(null)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {students.map((student) => {
        const studentPickups = pickups.filter((p) => p.student_id === student.id)
        return (
          <div key={student.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {student.first_name} {student.last_name}
              </h2>
              <button
                onClick={() => setFormFor({ studentId: student.id, editing: null })}
                className="flex items-center gap-1.5 rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Person
              </button>
            </div>

            {studentPickups.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No authorized pickup persons registered yet.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {studentPickups.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL, not a Next-optimizable static asset
                      <img src={p.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                        <UserIcon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{p.full_name}</p>
                      {p.relationship && <p className="text-xs text-gray-500 dark:text-gray-400">{p.relationship}</p>}
                      {p.phone_number && <p className="text-xs text-gray-500 dark:text-gray-400">{p.phone_number}</p>}
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => setFormFor({ studentId: student.id, editing: p })}
                          className="text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setRemoving(p)}
                          className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {formFor && (
        <PickupFormModal studentId={formFor.studentId} editing={formFor.editing} onClose={() => setFormFor(null)} />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove this pickup person?"
          description={`${removing.full_name} will no longer be authorized to pick up this child.`}
          confirmLabel="Yes, Remove"
          tone="danger"
          isPending={isRemoving}
          onConfirm={handleConfirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  )
}
