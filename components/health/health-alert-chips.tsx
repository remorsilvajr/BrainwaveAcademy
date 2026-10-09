import { AlertTriangle, HeartPulse, Pill } from 'lucide-react'
import type { HealthAlert } from '@/lib/health'

const STYLES: Record<HealthAlert['kind'], string> = {
  severe: 'bg-red-600 text-white',
  allergy: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  medical: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  medication: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
}

// The flags from lib/health.ts's healthAlerts, as small chips beside a name.
export function HealthAlertChips({ alerts, className = '' }: { alerts: HealthAlert[]; className?: string }) {
  if (alerts.length === 0) return null
  return (
    <span className={`flex min-w-0 max-w-full flex-wrap gap-1 ${className}`}>
      {alerts.map((a) => {
        const Icon = a.kind === 'medication' ? Pill : a.kind === 'medical' ? HeartPulse : AlertTriangle
        return (
          <span
            key={a.kind}
            title={`${a.label}: ${a.text}`}
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLES[a.kind]}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {a.label}: {a.text}
            </span>
          </span>
        )
      })}
    </span>
  )
}
