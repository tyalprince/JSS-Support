// Domain/address config for the serverless functions. Pittsburgh moved its mail and hosts from
// jumpstartsportspgh.com / *.vercel.app to jumpstartsportspittsburgh.com; keep the strings here
// rather than scattered through the handlers.

export const EMAIL_DOMAIN = 'jumpstartsportspittsburgh.com'
// The old domain still receives mail (the worker routes both), so tickets that came in on it
// keep replying from their own address.
export const LEGACY_EMAIL_DOMAIN = 'jumpstartsportspgh.com'

export const jssEmail = (local) => `${local}@${EMAIL_DOMAIN}`

// This app's public origin — used for absolute URLs in outbound email (logo).
export const SITE_ORIGIN = 'https://support.jumpstartsportspittsburgh.com'
export const PUBLIC_WEBSITE_URL = 'https://www.jumpstartsportspittsburgh.com'

export const DEFAULT_FROM_ADDRESS = jssEmail('support')
export const DEFAULT_FROM = `Jump Start Sports Support <${DEFAULT_FROM_ADDRESS}>`
export const DEFAULT_NOTIFY_EMAIL = jssEmail('info')

// Only ever send from an address we actually control inbound routing for — never trust
// ticket.inbound_address blindly as a From header, even though it's our own worker's data.
export const KNOWN_INBOUND_ADDRESSES = [
  'help@jumpstartsportspgh.com',
  'questions@jumpstartsportspgh.com',
  'support@jumpstartsportspgh.com',
  'info@jumpstartsportspgh.com',
  'help@jumpstartsportspittsburgh.com',
  'questions@jumpstartsportspittsburgh.com',
  'support@jumpstartsportspittsburgh.com',
  'info@jumpstartsportspittsburgh.com',
]

// Replies go out from the address the ticket came in on, else support@ on the new domain.
export function replyFromAddress(inboundAddress) {
  return KNOWN_INBOUND_ADDRESSES.includes(inboundAddress) ? inboundAddress : DEFAULT_FROM_ADDRESS
}
