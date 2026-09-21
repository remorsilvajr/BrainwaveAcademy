'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import { createSystemUser, type CreateSystemUserState } from '@/app/admin/create-new-account/actions'

const initialState: CreateSystemUserState = {}

const roleOptions = [
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'admin', label: 'Admin' },
]

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label} {required && <span className="text-[#e6007e]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function CreateAccountForm() {
  const [state, formAction, isPending] = useActionState(createSystemUser, initialState)
  const values = state.values ?? {}
  const fieldErrors = state.fieldErrors ?? {}

  const [role, setRole] = useState(values.role || 'parent')
  const [relationship, setRelationship] = useState(values.relationship_to_student ?? '')
  const [gender, setGender] = useState(values.gender ?? '')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The `avatars` bucket this uploads to already enforces a 2MB
  // file_size_limit server-side — matching it here gives an immediate
  // client-side message instead of a round trip that fails at Storage
  // anyway, and stays safely under Vercel's separate 4.5MB platform-level
  // cap on serverless function request bodies (independent of this repo's
  // own next.config.ts `serverActions.bodySizeLimit`, which only governs
  // Next's application-level check, not the platform's) — a photo that
  // snuck past a looser check used to hit that platform limit instead,
  // crashing the whole submission generically with no indication of why.
  const MAX_PHOTO_BYTES = 2 * 1024 * 1024

  function handlePhotoChange(file: File | null) {
    if (file && file.size > MAX_PHOTO_BYTES) {
      setPhotoError('That photo is too large. Please choose one under 2MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setPhotoError('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  return (
    <form
      action={formAction}
      className="mx-auto max-w-5xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create System User</h2>

      {state.error && (
        <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 py-10 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Profile preview"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow">
                <Camera className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {photoPreview ? 'Change Profile Photo' : 'Upload Profile Photo'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Optional: JPG, PNG or GIF up to 2MB</span>
            {photoError && <span className="text-xs text-red-600 dark:text-red-400">{photoError}</span>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            name="profile_photo"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-8 md:col-span-2">
          <div>
            <h3 className="border-b border-gray-100 dark:border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Personal Information
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field
                label="First Name"
                name="first_name"
                placeholder="e.g. Jane"
                required
                error={fieldErrors.first_name}
                defaultValue={values.first_name}
              />
              <Field
                label="Middle Name"
                name="middle_name"
                placeholder="Optional"
                error={fieldErrors.middle_name}
                defaultValue={values.middle_name}
              />
              <Field
                label="Last Name"
                name="last_name"
                placeholder="e.g. Doe"
                required
                error={fieldErrors.last_name}
                defaultValue={values.last_name}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Email Address"
                name="email"
                type="email"
                placeholder="jane.doe@example.com"
                required
                error={fieldErrors.email}
                defaultValue={values.email}
              />
              <Field
                label="Phone Number"
                name="phone_number"
                placeholder="0917 123 4567"
                error={fieldErrors.phone_number}
                defaultValue={values.phone_number}
              />
            </div>
          </div>

          <div>
            <h3 className="border-b border-gray-100 dark:border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Account Role &amp; Access
            </h3>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Assigned Role <span className="text-[#e6007e]">*</span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {roleOptions.map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 has-[:checked]:border-[#00a3e0] has-[:checked]:bg-sky-50 has-[:checked]:text-[#0b1b62]"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="sr-only"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              {fieldErrors.role && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.role}</p>}
            </div>

            {role === 'parent' && (
              <div className="mt-4">
                <label
                  htmlFor="relationship_to_student"
                  className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300"
                >
                  Relationship to Student
                </label>
                <select
                  id="relationship_to_student"
                  name="relationship_to_student"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2.5 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Not set</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            )}

            {(role === 'teacher' || (role === 'parent' && relationship === 'Guardian')) && (
              <div className="mt-4">
                <label htmlFor="gender" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2.5 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Not set</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Password</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                The new user gets an email with a one-time link to choose their own password. You never see or
                send a password.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-6">
        <Link
          href="/admin/user-management"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create & Send Password Link'}
        </button>
      </div>
    </form>
  )
}
