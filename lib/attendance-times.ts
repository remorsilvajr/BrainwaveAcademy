// Arrival / departure times on a student's attendance (Manila local time, "HH:MM").
// Client-safe; recordAttendanceTimes applies the same rules on the server.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTime(value: string): boolean {
  return TIME.test(value)
}

// The current Manila time as "HH:MM" (never the server's own clock zone).
export function manilaTimeNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const hour = (parts.find((p) => p.type === 'hour')?.value ?? '00').replace('24', '00')
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

// Postgres returns "HH:MM:SS"; the inputs and checks use "HH:MM".
export function toHHMM(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null
}

// "7:45 AM".
export function formatTime12(value: string | null | undefined): string {
  const hhmm = toHHMM(value)
  if (!hhmm) return '-'
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// For today's record. `now` is the current Manila "HH:MM".
export function validateAttendanceTimes(input: { status: string; arrival: string | null; departure: string | null; now: string }): string | null {
  const { status, arrival, departure, now } = input
  if (status === 'absent') return arrival || departure ? 'An absent child has no arrival or departure time.' : null
  if (arrival && !isValidTime(arrival)) return 'Enter a valid arrival time.'
  if (departure && !isValidTime(departure)) return 'Enter a valid departure time.'
  if (departure && !arrival) return 'Set the arrival time before the departure time.'
  if (arrival && arrival > now) return 'The arrival time cannot be later than now.'
  if (departure && departure > now) return 'The departure time cannot be later than now.'
  if (arrival && departure && departure < arrival) return 'The departure time cannot be before the arrival time.'
  return null
}
