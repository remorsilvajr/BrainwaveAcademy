import { AlertTriangle, HeartPulse, Phone } from 'lucide-react'
import type { EmergencyContact, StudentHealth } from '@/lib/health'

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  )
}

// Read-only view of a child's health and emergency information, for teachers and
// on the student dashboards. A severe allergy is the loudest thing on it.
export function HealthSummary({ health, contacts }: { health: StudentHealth | null; contacts: EmergencyContact[] }) {
  const hasAnything =
    !!health &&
    !!(health.allergies || health.medical_conditions || health.medications || health.doctor_name || health.preferred_hospital || health.notes)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        <HeartPulse className="h-5 w-5 text-[#e6007e]" />
        Health &amp; Emergency
      </h2>

      {health?.severe_allergy && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Severe allergy: {health.allergies}
        </p>
      )}

      {!hasAnything && contacts.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No health or emergency information has been added yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!health?.severe_allergy && <Row label="Allergies" value={health?.allergies ?? null} />}
          <Row label="Medical conditions" value={health?.medical_conditions ?? null} />
          <Row label="Medications" value={health?.medications ?? null} />
          <Row label="Doctor" value={[health?.doctor_name, health?.doctor_phone].filter(Boolean).join(' · ') || null} />
          <Row label="Preferred hospital" value={health?.preferred_hospital ?? null} />
          <Row label="Notes" value={health?.notes ?? null} />
        </div>
      )}

      {contacts.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Emergency contacts</p>
          <ul className="space-y-1.5">
            {[...contacts]
              .sort((a, b) => a.position - b.position)
              .map((c) => (
                <li key={c.position} className="flex flex-wrap items-center gap-x-3 text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-medium">{c.full_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{c.relationship}</span>
                  <a href={`tel:${c.phone_number.replace(/\s/g, '')}`} className="flex items-center gap-1 text-[#00a3e0] hover:underline dark:text-sky-400">
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone_number}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
