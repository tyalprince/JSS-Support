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
 * The ticket an inbound email continues: same sender, same subject (ignoring
 * reply prefixes), newest first. `tickets` are the sender's recent tickets.
 */
export function findThread(tickets, subject) {
  const key = threadKey(subject)
  if (!key) return null
  return (tickets || []).find(t => threadKey(t.subject) === key) || null
}
