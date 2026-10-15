// One bar split by attendance status: present green, late amber, absent red,
// not marked grey. Widths are shares of `total`; empty when there's no one.
export function AttendanceSplitBar({
  present,
  late,
  absent,
  total,
  className = '',
}: {
  present: number
  late: number
  absent: number
  total: number
  className?: string
}) {
  if (total <= 0) return null
  const pct = (n: number) => `${(n / total) * 100}%`
  const unmarked = Math.max(total - present - late - absent, 0)
  return (
    <div
      role="img"
      aria-label={`${present} present, ${late} late, ${absent} absent, ${unmarked} not marked`}
      className={`flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
    >
      <div className="h-full bg-green-500" style={{ width: pct(present) }} />
      <div className="h-full bg-amber-400" style={{ width: pct(late) }} />
      <div className="h-full bg-red-500" style={{ width: pct(absent) }} />
    </div>
  )
}
