import type { SupabaseClient } from '@supabase/supabase-js'

// Pickup history (pickup_records). Dates and times are always shown in Manila time,
// whatever the server's or browser's zone.

export type PickupRecordRow = {
  id: string
  student_id: string
  student_name: string
  person_name: string
  relationship: string | null
  method: 'scan' | 'name'
  recorded_by_name: string
  picked_up_at: string
}

export const PICKUP_HISTORY_LIMIT = 2000

// "Friday, October 9, 2026"
export function formatManilaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

// "3:05 PM"
export function formatManilaTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
}

// "2026-10-09", for date-range filters.
export function manilaDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

// Newest first, under the caller's RLS (staff: everyone; parent: their children).
// One over the cap is asked for so the page can say older records were left out.
export async function loadPickupHistory(supabase: SupabaseClient, studentIds?: string[]) {
  let query = supabase
    .from('pickup_records')
    .select('id, student_id, student_name, person_name, relationship, method, recorded_by_name, picked_up_at')
    .order('picked_up_at', { ascending: false })
    .limit(PICKUP_HISTORY_LIMIT + 1)
  if (studentIds) query = query.in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
  const { data } = await query
  const all = (data ?? []) as PickupRecordRow[]
  return { rows: all.slice(0, PICKUP_HISTORY_LIMIT), capped: all.length > PICKUP_HISTORY_LIMIT }
}
