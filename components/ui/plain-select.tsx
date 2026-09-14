'use client'

import { DropdownField, type DropdownOption } from '@/components/ui/dropdown-field'

// A labeled single-value dropdown for plain option lists (Gender,
// Relationship, and similar short enums) — the non-searchable sibling of
// SearchableSelect, built on the same DropdownField a native <select> would
// otherwise need to be for this app's dark-mode/copy-safety reasons (see
// DropdownField's own note). Renders a hidden input under `name` so it drops
// into an existing `useActionState`/FormData form the same way a real
// <select name=...> would.
//
// `extraLabelRow` reproduces the invisible spacer line DobSelect's own
// "Day/Month/Year" mini-labels push its inputs down by — pass it whenever
// this sits in the same grid row as a DobSelect, so the two controls' boxes
// line up instead of this one sitting a row higher.
export function PlainSelect({
  label,
  name,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  extraLabelRow,
}: {
  label: string
  name?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder: string
  error?: string
  extraLabelRow?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {extraLabelRow && <span aria-hidden className="mb-1 block text-xs font-medium invisible">{label}</span>}
      <DropdownField
        value={value}
        options={options}
        placeholder={placeholder}
        ariaLabel={label}
        hasError={!!error}
        onChange={onChange}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  )
}
