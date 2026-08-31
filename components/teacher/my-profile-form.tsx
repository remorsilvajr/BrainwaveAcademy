'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMyProfile, uploadMyAvatar, removeMyAvatar } from '@/app/teacher/my-profile/actions'
import { formatDateShort } from '@/lib/format'
import { isValidPhilippineMobile } from '@/lib/phone'
import { AvatarEditor } from '@/components/ui/avatar-editor'

type Profile = {
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  gender: string | null
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
  const [gender, setGender] = useState(profile.gender ?? '')

  // Photo is staged locally until Save is clicked — see
  // components/parent/my-profile-form.tsx for why (previously committed to
  // the DB the instant a file was picked, with no way to back out) and for
  // why removal follows the same deferred pattern via its own flag.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePending, setRemovePending] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const isDirty =
    phone !== (profile.phone_number ?? '') ||
    dob !== (profile.date_of_birth ?? '') ||
    gender !== (profile.gender ?? '') ||
    pendingPhoto !== null ||
    removePending

  function handleCancel() {
    setPhone(profile.phone_number ?? '')
    setDob(profile.date_of_birth ?? '')
    setGender(profile.gender ?? '')
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
      const saved = await updateMyProfile({ phone_number: phone, date_of_birth: dob, gender })
      setPhone(saved.phone_number ?? '')
      setDob(saved.date_of_birth ?? '')
      setGender(saved.gender ?? '')
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <AvatarEditor
            imageUrl={displayedAvatarUrl}
            onFileSelected={handlePhotoChange}
            onRemove={displayedAvatarUrl ? handlePhotoRemove : undefined}
            disabled={isSaving}
          />

          <p className="mt-4 text-lg font-bold text-gray-900">{fullName}</p>
          <span className="mt-1 inline-block rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Teacher
          </span>

          <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Teacher ID</span>
              <span className="font-semibold text-gray-900">{profile.account_id ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold ${profile.is_verified ? 'text-green-600' : 'text-amber-600'}`}>
                {profile.is_verified ? 'Active / Verified' : 'Not Verified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member Since</span>
              <span className="font-semibold text-gray-900">{formatDateShort(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-2">
          <h2 className="border-b border-gray-100 pb-3 text-lg font-bold text-gray-900">
            Personal Details
          </h2>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Full Name</label>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600">
              {fullName}
              <span className="text-xs text-gray-400">🔒</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">To change your legal name, please contact the school office.</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-[#0b1b62]">
                Phone Number
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-semibold text-[#0b1b62]">
                Email Address
                {profile.is_verified && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    Verified
                  </span>
                )}
              </label>
              <div className="rounded-lg border border-slate-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600">
                {profile.email}
              </div>
            </div>
            <div>
              <label htmlFor="dob" className="mb-1 block text-sm font-semibold text-[#0b1b62]">
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-semibold text-[#0b1b62]">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        {isDirty && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-sm font-semibold text-[#00a3e0] hover:underline disabled:opacity-60"
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
