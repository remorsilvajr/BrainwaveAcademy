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

export function isToday(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
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
