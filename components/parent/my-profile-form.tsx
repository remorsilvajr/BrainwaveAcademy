'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMyProfile, uploadMyAvatar, removeMyAvatar } from '@/app/parent/my-profile/actions'
import { formatDateShort } from '@/lib/format'
import { isValidPhilippineMobile } from '@/lib/phone'
import { dobInputMin, dobInputMax, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { AvatarEditor } from '@/components/ui/avatar-editor'
import { DobSelect } from '@/components/ui/dob-select'

type Profile = {
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  relationship_to_student: string | null
  account_id: string | null
  is_verified: boolean
  avatar_url: string | null
  created_at: string
}

export function MyProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const fullName = `${profile.first_name}${profile.middle_name ? ' ' + profile.middle_name : ''} ${profile.last_name}`

  const [phone, setPhone] = useState(profile.phone_number ?? '')
  const [dob, setDob] = useState(profile.date_of_birth ?? '')
  const [relationship, setRelationship] = useState(profile.relationship_to_student ?? '')

  // Photo changes are staged locally (preview only) until Save Profile
  // Changes is actually clicked — it was previously uploading and
  // committing to the database the instant a file was chosen, with no way
  // to back out via Cancel / Discard. Removal follows the same deferred
  // pattern, tracked separately since "no pending photo" and "pending
  // removal of the existing photo" are different states.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePending, setRemovePending] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const isDirty =
    phone !== (profile.phone_number ?? '') ||
    dob !== (profile.date_of_birth ?? '') ||
    relationship !== (profile.relationship_to_student ?? '') ||
    pendingPhoto !== null ||
    removePending

  function handleCancel() {
    setPhone(profile.phone_number ?? '')
    setDob(profile.date_of_birth ?? '')
    setRelationship(profile.relationship_to_student ?? '')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPendingPhoto(null)
    setPhotoPreview(null)
    setRemovePending(false)
    setMessage(null)
  }

  async function handleSave() {
    // Validate before touching the avatar — uploadMyAvatar/removeMyAvatar
    // commit straight to the database with no way to undo, so running them
    // first meant a field error below (e.g. an invalid phone number) still
    // silently kept the new photo while reporting the whole save as failed.
    if (phone.trim() && !isValidPhilippineMobile(phone.trim())) {
      setMessage({
        text: 'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.',
        isError: true,
      })
      return
    }

    setIsSaving(true)
    setMessage(null)
    try {
      if (pendingPhoto) {
        const formData = new FormData()
        formData.append('avatar', pendingPhoto)
        await uploadMyAvatar(formData)
      } else if (removePending) {
        await removeMyAvatar()
      }
      const saved = await updateMyProfile({ phone_number: phone, date_of_birth: dob, relationship_to_student: relationship })
      setPhone(saved.phone_number ?? '')
      setDob(saved.date_of_birth ?? '')
      setRelationship(saved.relationship_to_student ?? '')
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPendingPhoto(null)
      setPhotoPreview(null)
      setRemovePending(false)
      setMessage({ text: 'Profile updated.', isError: false })
      router.refresh()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Something went wrong.', isError: true })
    } finally {
      setIsSaving(false)
    }
  }

  function handlePhotoChange(file: File) {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPendingPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePending(false)
  }

  function handlePhotoRemove() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPendingPhoto(null)
    setPhotoPreview(null)
    setRemovePending(true)
  }

  const displayedAvatarUrl = removePending ? null : (photoPreview ?? profile.avatar_url)

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
          <AvatarEditor
            imageUrl={displayedAvatarUrl}
            onFileSelected={handlePhotoChange}
            onRemove={displayedAvatarUrl ? handlePhotoRemove : undefined}
            disabled={isSaving}
          />

          <p className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">{fullName}</p>
          <span className="mt-1 inline-block rounded-full bg-sky-50 dark:bg-sky-950/30 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
            Primary Guardian / Parent
          </span>

          <div className="mt-6 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Account ID</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{profile.account_id ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`font-semibold ${profile.is_verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {profile.is_verified ? 'Verified Account' : 'Not Verified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Member Since</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDateShort(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 md:col-span-2">
          <h2 className="border-b border-gray-100 dark:border-gray-800 pb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Personal Details
          </h2>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Parent Full Name</label>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-100 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
              {fullName}
              <span className="text-xs text-gray-400 dark:text-gray-500">🔒</span>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">To change your legal name, please contact the school office.</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Phone Number
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Email Address
                {profile.is_verified && (
                  <span className="rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-xs font-medium text-green-700">
                    Verified
                  </span>
                )}
              </label>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-100 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                {profile.email}
              </div>
            </div>
            <DobSelect
              label="Date of Birth"
              defaultValue={dob}
              onChange={setDob}
              min={dobInputMin(MAX_AGE)}
              max={dobInputMax(MIN_ADULT_AGE)}
            />
            <div>
              <label htmlFor="relationship" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Relationship to Student
              </label>
              <select
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Not set</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.isError ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/30 text-green-700'}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        {isDirty && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline disabled:opacity-60"
          >
            Cancel / Discard
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-[#e6007e] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save Profile Changes'}
        </button>
      </div>
    </div>
  )
}
