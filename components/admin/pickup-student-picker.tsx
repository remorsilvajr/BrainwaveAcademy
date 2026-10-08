'use client'

import { useRouter } from 'next/navigation'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'

// Picks whose pickup list the admin is managing; the choice lives in the URL
// (?tab=manage&student=) so the page renders that child's list server-side.
export function PickupStudentPicker({ options, value }: { options: SearchableOption[]; value: string | null }) {
  const router = useRouter()
  return (
    <div className="max-w-md">
      <SearchableSelect
        options={options}
        value={value}
        onChange={(id) => router.push(`/admin/pickup-verification?tab=manage&student=${encodeURIComponent(id)}`)}
        placeholder="Search for a student…"
      />
    </div>
  )
}
