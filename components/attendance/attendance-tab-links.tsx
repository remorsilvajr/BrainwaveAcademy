import Link from 'next/link'

// Server-friendly tab strip for the Attendance pages: each tab is a `?tab=` link, so
// the page renders only the data that tab needs. Same look as the Payments tabs.
export function AttendanceTabLinks({
  basePath,
  active,
  tabs,
}: {
  basePath: string
  active: string
  tabs: { key: string; label: string }[]
}) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.key === tabs[0].key ? basePath : `${basePath}?tab=${t.key}`}
          className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-medium ${
            active === t.key
              ? 'border-[#e6007e] text-[#e6007e]'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
