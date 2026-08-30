'use client'

import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { updateUserProfile } from '@/app/admin/user-management/actions'

type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  phone_number: string | null
}

export function UserEditModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [phone, setPhone] = useState(user.phone_number ?? '')
  const [role, setRole] = useState(user.role)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        role,
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
          <div className="grid grid-cols-2 gap-3">
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
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            />
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
