'use client'

import { useState, type FocusEvent } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatPhoneAsTyped, MOBILE_LOCAL_DIGITS, splitPhone } from '@/lib/phone'

// A PH mobile number field: people may type 0917..., +63 917... or 917..., the
// digits group themselves as they type ("0917 123 4567"), anything past the 10
// digits after the 0 / +63 is not taken, and a 10-segment bar plus a short
// message underneath show progress: navy while typing, green once complete,
// red when the first digit isn't 9 or the field is left unfinished. Controlled
// (`value` + `onChange`) or not (`defaultValue`); either way it posts under
// `name` like a plain input. The server still validates and stores every
// number as "+63 917 123 4567".
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
  // Unfinished only counts as a problem once the person has left the field.
  const [left, setLeft] = useState(false)
  const shown = value !== undefined ? value : own
  const { local } = splitPhone(shown)
  const count = Math.min(local.length, MOBILE_LOCAL_DIGITS)
  const empty = shown.trim() === ''
  const complete = count === MOBILE_LOCAL_DIGITS && local.startsWith('9')
  const wrongStart = local.length > 0 && !local.startsWith('9')
  const unfinished = left && !empty && !complete && !wrongStart
  const state: 'empty' | 'typing' | 'complete' | 'error' = empty
    ? 'empty'
    : wrongStart || unfinished
      ? 'error'
      : complete
        ? 'complete'
        : 'typing'

  function handleChange(raw: string) {
    const next = formatPhoneAsTyped(raw)
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }

  // Tailwind's trailing "!" wins over the border colour in the caller's own classes.
  const stateBorder =
    state === 'complete'
      ? 'border-green-500! focus:border-green-600! dark:border-green-500!'
      : state === 'error' && !invalid
        ? 'border-red-400! focus:border-red-500!'
        : ''

  const segmentColor = state === 'complete' ? 'bg-green-500' : state === 'error' ? 'bg-red-500' : 'bg-[#0b1b62] dark:bg-indigo-400'
  // When the form shows its own error under the field, keep this line short so
  // the explanation isn't said twice.
  const message =
    state === 'complete'
      ? 'Complete mobile number'
      : invalid
        ? `${count} of ${MOBILE_LOCAL_DIGITS} digits`
        : wrongStart
        ? 'A mobile number starts with 9 after the 0 or +63.'
        : unfinished
          ? `Only ${count} of ${MOBILE_LOCAL_DIGITS} digits. A mobile number has ${MOBILE_LOCAL_DIGITS} after the 0 or +63.`
          : `${count} of ${MOBILE_LOCAL_DIGITS} digits`

  return (
    <div>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={shown}
        onChange={(e) => {
          setLeft(false)
          handleChange(e.target.value)
        }}
        onBlur={(e) => {
          setLeft(true)
          onBlur?.(e)
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || state === 'error' || undefined}
        aria-describedby={id ? `${id}-count` : undefined}
        className={`${className} transition-colors ${stateBorder}`}
      />
      {!empty && (
        <div id={id ? `${id}-count` : undefined} aria-live="polite" className="mt-1.5">
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: MOBILE_LOCAL_DIGITS }, (_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i < count ? segmentColor : 'bg-gray-200 dark:bg-gray-700'}`}
              />
            ))}
          </div>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              state === 'complete'
                ? 'text-green-700 dark:text-green-400'
                : state === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {state === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            {state === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
            <span>{message}</span>
          </p>
        </div>
      )}
    </div>
  )
}
