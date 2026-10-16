// Email threading for inbound support mail (api/inbound/email.js): a parent's
// reply ("Re: Basketball") belongs on the ticket it answers, not on a new one.

/** "RE: Fwd: re:  Basketball " -> "basketball" (reply/forward prefixes, spacing, case). */
export function threadKey(subject) {
  let s = String(subject || '').trim()
  // Strip any run of reply/forward prefixes, including "Re[2]:" and "AW:" / "WG:" (German clients).
  const prefix = /^(?:re|fw|fwd|aw|wg|sv|vs)(?:\s*\[\d+\])?\s*:\s*/i
  while (prefix.test(s)) s = s.replace(prefix, '')
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * The ticket an inbound email continues. `tickets` are the sender's recent
 * tickets, newest first. A reply to a conversation (same subject, ignoring
 * Re:/Fwd:) goes to that conversation; otherwise any new email from a parent
 * who already has a recent ticket goes to their latest one — every re-email
 * reopens their ticket instead of starting another.
 */
export function findThread(tickets, subject) {
  const list = tickets || []
  if (!list.length) return null
  const key = threadKey(subject)
  return (key && list.find(t => threadKey(t.subject) === key)) || list[0]
}

/**
 * Fields that reopen a resolved/closed ticket. Set here because the database
 * trigger only records a reopen from 'closed' and leaves resolved_at set on a
 * resolved ticket.
 */
export function reopenPatch(ticket, now = new Date()) {
  if (ticket.status !== 'resolved' && ticket.status !== 'closed') return null
  return {
    status: 'open',
    reopened_at: now.toISOString(),
    reopened_count: (Number(ticket.reopened_count) || 0) + 1,
    resolved_at: null,
    closed_at: null,
  }
}
