'use client'

import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { updateUserProfile } from '@/app/admin/user-management/actions'
import { calculateAge, formatDateLong } from '@/lib/format'

type LinkedStudent = { id: string; first_name: string; middle_name: string | null; last_name: string }

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
  parent_student?: { relationship: string; students: LinkedStudent | null }[]
}

export function UserEditModal({ user, onClose }: { user: Profile; onClose: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Email</label>
            <input
              disabled
              value={user.email}
              className="w-full rounded-lg border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Middle Name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
          </div>
          {user.date_of_birth && (
            <div>
              <p className="mb-1 text-sm font-semibold text-[#0b1b62]">Date of Birth</p>
              <p className="rounded-lg border border-slate-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {formatDateLong(user.date_of_birth)} ({calculateAge(user.date_of_birth)} years old)
              </p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567 or +63 917 123 4567"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Any valid PH mobile format works — it&apos;ll be saved consistently as +63 9XX XXX XXXX.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            >
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === 'parent' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">
                Relationship to Student
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
              >
                <option value="">Not set</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
          )}

          {role === 'parent' && (
            <div>
              <p className="mb-1 text-sm font-semibold text-[#0b1b62]">Students</p>
              {linkedStudents.length > 0 ? (
                <ul className="space-y-1 rounded-lg border border-slate-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {linkedStudents.map((s) => (
                    <li key={s.id}>
                      {s.first_name} {s.middle_name ? `${s.middle_name} ` : ''}{s.last_name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                  No students linked to this account yet.
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
