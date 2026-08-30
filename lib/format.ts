export function calculateAge(dob: string) {
  const birth = new Date(dob)
  const diffMs = Date.now() - birth.getTime()
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000))
}

export function formatDateLong(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// The school is always in the Philippines (UTC+8, no DST), but the server
// this app runs on isn't necessarily — Date.getFullYear()/getMonth()/
// getDate() and toISOString() both resolve against the *runtime's* local
// timezone (typically UTC in this dev environment), not Manila's. That
// silently shifted "today" by a day for roughly a third of each day
// (Manila's morning, while UTC is still on the previous calendar date) —
// e.g. it made "today" unselectable in the attendance date picker's `max`.
// Every "what date is it right now" check in this app should go through
// these, not a bare `new Date()`.
function toManilaIso(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function todayIso() {
  return toManilaIso(new Date())
}

// Same reasoning as todayIso() above — Date.getHours() reads the runtime's
// local hour, not Manila's, which broke the Dashboard's "Good morning" /
// "Good afternoon" greeting whenever the server's local time and Manila's
// disagreed on which half of the day it is.
export function manilaHour() {
  // hour12: false renders midnight as "24" rather than "0" in some
  // environments (a known Intl quirk) — % 24 normalizes that back to 0.
  return (
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        hour12: false,
      }).format(new Date())
    ) % 24
  )
}

// dateString may be a plain "YYYY-MM-DD" (already unambiguous) or a full
// timestamp (e.g. a submitted_at column) — only the latter needs
// re-resolving against Manila's calendar day rather than UTC's.
export function isToday(dateString: string) {
  const iso = dateString.length > 10 ? toManilaIso(new Date(dateString)) : dateString
  return iso === todayIso()
}

const statusLabels: Record<string, string> = {
  pending_review: 'Pending',
  needs_correction: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function formatStatus(status: string) {
  return statusLabels[status] ?? status
}

export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
