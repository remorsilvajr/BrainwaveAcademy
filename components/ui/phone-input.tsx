'use client'

import { useState, type FocusEvent } from 'react'
import { formatPhoneAsTyped, MOBILE_LOCAL_DIGITS, splitPhone } from '@/lib/phone'

// A PH mobile number field: people may type 0917..., +63 917... or 917..., the
// digits group themselves as they type ("0917 123 4567"), anything past the 10
// digits after the 0 / +63 is not taken, and a small counter underneath says
// how many of those 10 are in. Controlled (`value` + `onChange`) or not
// (`defaultValue`); either way it posts under `name` like a plain input. The
// server still validates and stores every number as "+63 917 123 4567".
export function PhoneInput({
  id,
  name,
  value,
  defaultValue = '',
  onChange,
  onBlur,
  placeholder = 'e.g. 0917 123 4567',
  className,
  required,
  disabled,
  invalid,
}: {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  className: string
  required?: boolean
  disabled?: boolean
  invalid?: boolean
}) {
  const [own, setOwn] = useState(formatPhoneAsTyped(defaultValue))
  const shown = value !== undefined ? value : own
  const { local } = splitPhone(shown)
  const count = Math.min(local.length, MOBILE_LOCAL_DIGITS)
  const complete = count === MOBILE_LOCAL_DIGITS
  const wrongStart = local.length > 0 && !local.startsWith('9')

  function handleChange(raw: string) {
    const next = formatPhoneAsTyped(raw)
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }

  return (
    <div>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={id ? `${id}-count` : undefined}
        className={className}
      />
      {shown.trim() !== '' && (
        <p
          id={id ? `${id}-count` : undefined}
          aria-live="polite"
          className={`mt-1 text-xs ${
            wrongStart ? 'text-red-600 dark:text-red-400' : complete ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {wrongStart ? 'A mobile number starts with 9 after the 0 or +63.' : `${count} of ${MOBILE_LOCAL_DIGITS} digits${complete ? ' ✓' : ''}`}
        </p>
      )}
    </div>
  )
}
