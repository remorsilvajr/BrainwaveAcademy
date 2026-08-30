'use client'

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors disabled:opacity-60 ${
        checked ? 'justify-end bg-green-500' : 'justify-start bg-gray-300'
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}
