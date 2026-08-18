export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
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
