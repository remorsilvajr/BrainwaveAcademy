'use client'

import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { updateUserProfile, updateUserAvatar, removeUserAvatar } from '@/app/admin/user-management/actions'
import { calculateAge, formatDateLong } from '@/lib/format'
import { AvatarEditor } from '@/components/ui/avatar-editor'

type LinkedStudent = { id: string; first_name: string; middle_name: string | null; last_name: string }
type Applicant = {
  id: string
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
}

type Profile = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  role: string
  phone_number: string | null
  date_of_birth: string | null
  relationship_to_student: string | null
  avatar_url: string | null
  parent_student?: { relationship: string; students: LinkedStudent | null }[]
  applicants?: Applicant[]
}

export function UserEditModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [firstName, setFirstName] = useState(user.first_name)
  const [middleName, setMiddleName] = useState(user.middle_name ?? '')
  const [lastName, setLastName] = useState(user.last_name)
  const [phone, setPhone] = useState(user.phone_number ?? '')
  const [role, setRole] = useState(user.role)
  const [relationship, setRelationship] = useState(user.relationship_to_student ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const linkedStudents = (user.parent_student ?? [])
    .map((ps) => ps.students)
    .filter((s): s is LinkedStudent => s !== null)
  const applicants = user.applicants ?? []

  async function handleAvatarSelected(file: File) {
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const newUrl = await updateUserAvatar(user.id, formData)
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
      await removeUserAvatar(user.id)
      setAvatarUrl(null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await updateUserProfile(user.id, {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone_number: phone,
        role,
        relationship_to_student: relationship,
      })
      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const optionClasses = "bg-white text-slate-900 dark:bg-gray-800 dark:text-slate-100"
  const inputClasses = "w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit User</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <AvatarEditor
            imageUrl={avatarUrl}
            onFileSelected={handleAvatarSelected}
            onRemove={avatarUrl ? handleAvatarRemove : undefined}
            disabled={isSavingAvatar}
            sizeClassName="h-20 w-20"
          />
          {avatarError && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Email</label>
            <input
              disabled
              value={user.email}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-100 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Middle Name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Optional"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className={inputClasses}
              />
            </div>
          </div>
          {user.date_of_birth && (
            <div>
              <p className="mb-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Date of Birth</p>
              <p className="rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                {formatDateLong(user.date_of_birth)} ({calculateAge(user.date_of_birth)} years old)
              </p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567 or +63 917 123 4567"
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Any valid PH mobile format works — it&apos;ll be saved consistently as +63 9XX XXX XXXX.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClasses}
            >
              <option value="parent" className={optionClasses}>Parent</option>
              <option value="teacher" className={optionClasses}>Teacher</option>
              <option value="admin" className={optionClasses}>Admin</option>
            </select>
          </div>

          {role === 'parent' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Relationship to Student
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={inputClasses}
              >
                <option value="" className={optionClasses}>Not set</option>
                <option value="Mother" className={optionClasses}>Mother</option>
                <option value="Father" className={optionClasses}>Father</option>
                <option value="Guardian" className={optionClasses}>Guardian</option>
              </select>
            </div>
          )}

          {role === 'parent' && (
            <div>
              <p className="mb-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Enrolled Students</p>
              {linkedStudents.length > 0 ? (
                <ul className="space-y-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {linkedStudents.map((s) => (
                    <li key={s.id}>
                      {s.first_name} {s.middle_name ? `${s.middle_name} ` : ''}{s.last_name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                  No enrolled students yet.
                </p>
              )}
            </div>
          )}

          {role === 'parent' && applicants.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Applicants <span className="font-normal text-gray-400 dark:text-gray-500">(not yet enrolled)</span>
              </p>
              <ul className="space-y-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                {applicants.map((a) => (
                  <li key={a.id}>
                    {a.student_first_name} {a.student_middle_name ? `${a.student_middle_name} ` : ''}
                    {a.student_last_name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#0b1b62] dark:bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] dark:hover:bg-indigo-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}