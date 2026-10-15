'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

// Shared by both enroll wizards (public /enroll and /parent/enroll-a-student)
// so a plain text field renders and behaves identically in both.
export function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  pattern,
  title,
  defaultValue,
  onChange,
  onBlur,
  min,
  max,
  minLength,
  extraLabelRow,
  confirm,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  pattern?: string
  title?: string
  defaultValue?: string
  onChange?: (value: string) => void
  // Fired when the person leaves the field, with its current value: the enroll
  // forms use it to show an error before Submit.
  onBlur?: (value: string) => void
  min?: string
  max?: string
  minLength?: number
  // Matches DobSelect's "Day/Month/Year" mini-label row so this field's box
  // lines up with a DobSelect sitting beside it in the same grid row,
  // instead of sitting a row higher (DobSelect has two label rows above its
  // inputs where a plain field only has one).
  extraLabelRow?: boolean
  // Optional: the same check the server runs. When the person leaves the field
  // and it passes, the box turns green with a check (cleared again on typing).
  confirm?: (value: string) => boolean
}) {
  const [confirmed, setConfirmed] = useState(false)
  const showOk = confirmed && !error
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {extraLabelRow && <span aria-hidden className="mb-1 hidden text-xs font-medium invisible sm:block">{label}</span>}
      {type === 'tel' ? (
        // Phone numbers get the digit counter and as-you-type spacing.
        <PhoneInput
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          onChange={(v) => onChange?.(v)}
          onBlur={(e) => onBlur?.(e.target.value)}
          invalid={!!error}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
          }`}
        />
      ) : (
      <div className="relative">
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        title={title}
        defaultValue={defaultValue}
        onChange={(e) => {
          setConfirmed(false)
          onChange?.(e.target.value)
        }}
        onBlur={(e) => {
          const v = e.target.value.trim()
          setConfirmed(!!confirm && v !== '' && confirm(v))
          onBlur?.(e.target.value)
        }}
        min={min}
        max={max}
        minLength={minLength}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : showOk ? 'border-green-500 pr-9 focus:border-green-600' : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      />
      {showOk && (
        <Check aria-label="Looks good" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
      )}
      </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
