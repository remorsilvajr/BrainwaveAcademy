'use client'

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
  min,
  max,
  minLength,
  extraLabelRow,
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
  min?: string
  max?: string
  minLength?: number
  // Matches DobSelect's "Day/Month/Year" mini-label row so this field's box
  // lines up with a DobSelect sitting beside it in the same grid row,
  // instead of sitting a row higher (DobSelect has two label rows above its
  // inputs where a plain field only has one).
  extraLabelRow?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {extraLabelRow && <span aria-hidden className="mb-1 hidden text-xs font-medium invisible sm:block">{label}</span>}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        title={title}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        minLength={minLength}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
