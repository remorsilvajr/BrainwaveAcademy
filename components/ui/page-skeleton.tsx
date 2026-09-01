// Generic Suspense fallback for a role portal's <main> content area — used
// by app/admin/loading.tsx, app/teacher/loading.tsx, and app/parent/loading.tsx
// so every sidebar navigation shows an instant loading shape instead of a
// frozen screen while the destination page's own Server Component data
// fetch resolves. Deliberately generic (title bar + a row of cards + a
// larger block) rather than bespoke per page — the goal is confirming "the
// click registered and something is happening," not pixel-matching every
// route's exact final layout.
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-80 max-w-full rounded-md bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800" />
    </div>
  )
}
