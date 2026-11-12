// Recognises our own automated outbound mail arriving back at the support inbox, so
// api/inbound/email.js can drop it instead of opening a prospect ticket. It gets there
// when an app BCCs or sends to info@/support@ (e.g. Registration's confirmations used to
// BCC info@). Pure: no I/O, so it is unit-tested in transactionalFilter.test.js.
//
// The worker passes the SMTP envelope sender (message.from), not the From header. For
// Resend that is the bounce address on the send./rsend. subdomain, e.g.
// 0100...-000000@rsend.jumpstartsportspittsburgh.com, so any local part there counts.
import { EMAIL_DOMAIN, LEGACY_EMAIL_DOMAIN } from './site.js'

const OWN_DOMAINS = [EMAIL_DOMAIN, LEGACY_EMAIL_DOMAIN]

// Resend's return-path subdomains on our domains.
const BOUNCE_SUBDOMAINS = ['send', 'rsend']

// Mailboxes our apps send automated mail from (never a person).
const AUTOMATED_LOCAL_PARTS = [
  'registration', 'noreply', 'no-reply', 'portal', 'hello',
  'newsletter', 'receipts', 'notifications',
]

// Subjects JSS-Registration's src/lib/email.ts sends (plus the older "Registration
// Confirmed" wording). Anchored at the start, so a parent's "Re:"/"Fwd:" reply still
// becomes a ticket. An optional "[SANDBOX] " prefix covers sandbox sends.
const TRANSACTIONAL_SUBJECTS = [
  /^you[’']re registered:/i,                          // confirmation + cart receipt
  /^you[’']re on the waitlist:/i,                     // waitlist confirmation
  /^registration confirmed\b/i,
  /^your jump start sports family portal is ready\b/i, // portal invite
]

// JSS-Family-Portal's api/camp-request subject: `[Family Portal] <request> – <participant>`.
const FAMILY_PORTAL_SUBJECT = /^\[family portal\]/i

function addressParts(raw) {
  if (!raw) return null
  const match = String(raw).match(/<([^>]+)>/)
  const addr = (match ? match[1] : String(raw)).trim().toLowerCase()
  const at = addr.lastIndexOf('@')
  if (at <= 0) return null
  return { local: addr.slice(0, at), domain: addr.slice(at + 1) }
}

// 'jumpstartsportspgh.com' -> '' ; 'send.jumpstartsportspgh.com' -> 'send' ; other -> null
function ownSubdomain(domain) {
  for (const d of OWN_DOMAINS) {
    if (domain === d) return ''
    if (domain.endsWith(`.${d}`)) return domain.slice(0, -(d.length + 1))
  }
  return null
}

/**
 * Is this inbound email our own automated outbound mail?
 * @param {{ from?: string, subject?: string }} email  from = address or "Name <address>"
 * @returns {string|null} a short reason when it should be skipped, else null
 */
export function ownTransactionalReason({ from, subject } = {}) {
  const subj = String(subject || '').trim().replace(/^\[sandbox\]\s*/i, '')
  // Family Portal camp requests (early pick-up etc.) are sent from portal@ to info@ on
  // purpose and staff work them as tickets, so they are never filtered.
  if (FAMILY_PORTAL_SUBJECT.test(subj)) return null

  const parts = addressParts(from)
  if (parts) {
    const sub = ownSubdomain(parts.domain)
    if (sub !== null) {
      if (BOUNCE_SUBDOMAINS.includes(sub)) return `resend_return_path:${parts.domain}`
      const local = parts.local.split('+')[0]
      if (AUTOMATED_LOCAL_PARTS.includes(local)) return `automated_sender:${local}@${parts.domain}`
    }
  }
  const hit = TRANSACTIONAL_SUBJECTS.find(re => re.test(subj))
  if (hit) return `transactional_subject:${hit.source}`
  return null
}
