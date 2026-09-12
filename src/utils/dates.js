export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Days the ticket has been unresolved: still counting for an open/in_progress ticket, frozen at
// whenever it was actually resolved/closed for one that's done.
export function daysUnresolved(ticket) {
  if (!ticket.created_at) return null
  const start = new Date(ticket.created_at)
  const isDone = ticket.status === 'resolved' || ticket.status === 'closed'
  const end = isDone ? new Date(ticket.resolved_at || ticket.closed_at || ticket.updated_at) : new Date()
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
}

// Date-only columns (e.g. session_start_date) come back as "YYYY-MM-DD" with no time —
// parsing that directly as UTC and rendering in a local zone can roll it back a day, so we
// pin it to local midnight first. Distinct from formatDate() above, which formats full ISO
// timestamps and is already relied on elsewhere for a shorter, year-less display.
export function formatDateOnly(d) {
  if (!d) return ''
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function isOverdue(ticket) {
  if (!ticket.due_at) return false
  if (ticket.status === 'resolved' || ticket.status === 'closed') return false
  return new Date(ticket.due_at).getTime() < Date.now()
}

export function timeUntil(iso) {
  if (!iso) return ''
  const diffMs = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const hours = Math.round(abs / (1000 * 60 * 60))
  const label = hours < 1 ? '<1h' : hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`
  return diffMs < 0 ? `${label} overdue` : `due in ${label}`
}
