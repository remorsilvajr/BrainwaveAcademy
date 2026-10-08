'use client'

// The class-photo permission question on both enroll forms. The answer lives in
// the parent form's state and is submitted through the hidden input (the radios
// have no `name`), so React's form reset after a failed submit can't clear it.
export function PhotoConsentChoice({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: 'yes' | 'no') => void
  error?: string
}) {
  const options = [
    { value: 'yes' as const, label: 'Yes, my child may appear in class photos' },
    { value: 'no' as const, label: 'No, please keep my child out of class photos' },
  ]
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        Class Photos <span className="text-[#e6007e]">*</span>
      </legend>
      <p className="mt-1 text-xs text-[#454650] dark:text-slate-400">
        Teachers share photos of class activities in the portal&apos;s Photo Album, where the parents of that class can see them.
        You can change this anytime in Settings or in the Photo Album.
      </p>
      <input type="hidden" name="photo_consent" value={value} />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
              value === o.value
                ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
                : error
                  ? 'border-red-400'
                  : 'border-slate-200 dark:border-slate-700'
            } text-[#454650] dark:text-slate-300`}
          >
            <input
              type="radio"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </fieldset>
  )
}
