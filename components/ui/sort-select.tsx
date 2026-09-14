'use client'

// A plain native <select> for the "Sort By" control every admin table gets
// alongside its search/filter inputs — deliberately matching those sibling
// filter selects' own native-<select> convention (e.g. the Status filter
// already sitting next to this in most of these toolbars) rather than the
// portal-based PlainSelect built for the public enroll page, where a
// visitor copying page text was the actual reported problem. That risk
// doesn't apply to an internal admin toolbar control, so there's no reason
// to pay the heavier component for it here.
export function SortSelect({
  value,
  onChange,
  options,
  label = 'Sort By',
  hideLabel = false,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label?: string
  // For a compact toolbar (e.g. sitting inline in a header row next to a
  // heading/button rather than a grid of labeled filter fields) — keeps the
  // label for screen readers via aria-label instead of dropping it entirely.
  hideLabel?: boolean
}) {
  return (
    <div>
      {!hideLabel && <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>}
      <select
        aria-label={hideLabel ? label : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
