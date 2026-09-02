'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { calculateAge, formatDateLong } from '@/lib/format'
import { dobInputMin, dobInputMax, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { updateTeacherRecord, updateTeacherAvatar, removeTeacherAvatar } from '@/app/admin/teachers/actions'
import { AvatarEditor } from '@/components/ui/avatar-editor'
import { DobSelect } from '@/components/ui/dob-select'
import { Modal } from '@/components/ui/modal'

type Teacher = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  gender: string | null
  account_id: string | null
  account_status: string
  avatar_url: string | null
}

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  blocked: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export function TeacherRecordModal({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const router = useRouter()

  const [avatarUrl, setAvatarUrl] = useState(teacher.avatar_url)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function handleAvatarSelected(file: File) {
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const newUrl = await updateTeacherAvatar(teacher.id, formData)
      setAvatarUrl(newUrl)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleAvatarRemove() {
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      await removeTeacherAvatar(teacher.id)
      setAvatarUrl(null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [firstName, setFirstName] = useState(teacher.first_name)
  const [middleName, setMiddleName] = useState(teacher.middle_name ?? '')
  const [lastName, setLastName] = useState(teacher.last_name)
  const [phone, setPhone] = useState(teacher.phone_number ?? '')
  const [dob, setDob] = useState(teacher.date_of_birth ?? '')
  const [gender, setGender] = useState(teacher.gender ?? '')

  const fullName = `${teacher.first_name}${teacher.middle_name ? ' ' + teacher.middle_name : ''} ${teacher.last_name}`

  async function handleSaveDetails() {
    setIsSaving(true)
    setSaveError('')
    try {
      await updateTeacherRecord(teacher.id, {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone_number: phone,
        date_of_birth: dob,
        gender,
      })
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setFirstName(teacher.first_name)
    setMiddleName(teacher.middle_name ?? '')
    setLastName(teacher.last_name)
    setPhone(teacher.phone_number ?? '')
    setDob(teacher.date_of_birth ?? '')
    setGender(teacher.gender ?? '')
    setSaveError('')
    setIsEditing(false)
  }

  return (
    <Modal onClose={onClose} maxWidth="lg">
      <div className="border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div>
                <AvatarEditor
                  imageUrl={avatarUrl}
                  onFileSelected={handleAvatarSelected}
                  onRemove={avatarUrl ? handleAvatarRemove : undefined}
                  disabled={isSavingAvatar}
                  sizeClassName="h-16 w-16"
                />
                {avatarError && <p className="mt-1 max-w-[64px] text-center text-[10px] text-red-600 dark:text-red-400">{avatarError}</p>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {teacher.first_name} {teacher.last_name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                      statusBadgeClasses[teacher.account_status] ?? statusBadgeClasses.inactive
                    }`}
                  >
                    {teacher.account_status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Account ID: {teacher.account_id ?? '—'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Personal Details
          </h3>

          {!isEditing && (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoField label="Legal Full Name" value={fullName} />
                <InfoField
                  label="Date of Birth (Age)"
                  value={
                    teacher.date_of_birth
                      ? `${formatDateLong(teacher.date_of_birth)} (${calculateAge(teacher.date_of_birth)}y)`
                      : 'Not set'
                  }
                />
                <InfoField
                  label="Gender"
                  value={teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : 'Not set'}
                />
                <InfoField label="Phone Number" value={teacher.phone_number ?? 'Not set'} />
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 rounded-lg border border-[#0b1b62] dark:border-indigo-300 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5"
              >
                Edit Personal Details
              </button>
            </div>
          )}

          {isEditing && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Middle Name</label>
                  <input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917 123 4567 or +63 917 123 4567"
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem]">
                <DobSelect
                  label="Date of Birth"
                  defaultValue={dob}
                  onChange={setDob}
                  min={dobInputMin(MAX_AGE)}
                  max={dobInputMax(MIN_ADULT_AGE)}
                />
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="">Not set</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
          >
            Close Record
          </button>
        </div>
    </Modal>
  )
}
