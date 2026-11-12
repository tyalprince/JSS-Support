// Domain/address config for the serverless functions, per franchise. Everything here comes
// from franchiseConfig() in the shared src/lib/jssApps.js, which reads JSS_FRANCHISE /
// JSS_SITE_DOMAIN / JSS_EMAIL_DOMAIN (prefixed VITE_ / NEXT_PUBLIC_ names work too) and, when
// those are unset, the deployment's VERCEL_PROJECT_PRODUCTION_URL. With nothing set this is
// Pittsburgh, exactly as before: mail from jumpstartsportspittsburgh.com, hosts on
// support.jumpstartsportspittsburgh.com. Keep the strings here rather than scattered through
// the handlers.
import { franchiseConfig, jssAppUrl, FRANCHISE_DOMAINS, DEFAULT_FRANCHISE } from '../../src/lib/jssApps.js'

// Pittsburgh moved its mail from jumpstartsportspgh.com to jumpstartsportspittsburgh.com. The
// old domain still receives mail (the worker routes both), so tickets that came in on it keep
// replying from their own address.
export const LEGACY_EMAIL_DOMAIN = 'jumpstartsportspgh.com'
const PITTSBURGH_EMAIL_DOMAIN = FRANCHISE_DOMAINS[DEFAULT_FRANCHISE]

// The mailboxes the support worker routes to /api/inbound/email.
const INBOUND_LOCAL_PARTS = ['help', 'questions', 'support', 'info']

/** Every domain/address value for a deployment with this env (pure; tests pass their own env). */
export function siteConfig(env = process.env) {
  const franchise = franchiseConfig(env)
  const emailDomain = franchise.emailDomain
  const jssEmail = (local) => `${local}@${emailDomain}`
  const websiteDomain = franchise.siteDomain || PITTSBURGH_EMAIL_DOMAIN
  // Pittsburgh's mail domain (also the Sandbox's until it gets its own) still has the legacy twin.
  const inboundDomains = emailDomain === PITTSBURGH_EMAIL_DOMAIN ? [LEGACY_EMAIL_DOMAIN, emailDomain] : [emailDomain]
  const fromAddress = jssEmail('support')
  return {
    franchise,
    EMAIL_DOMAIN: emailDomain,
    jssEmail,
    // This app's public origin — used for absolute URLs in outbound email (logo).
    SITE_ORIGIN: jssAppUrl('support', franchise.slug, franchise.domains),
    PUBLIC_WEBSITE_URL: `https://www.${websiteDomain}`,
    PUBLIC_WEBSITE_LABEL: websiteDomain,
    DEFAULT_FROM_ADDRESS: fromAddress,
    DEFAULT_FROM: `Jump Start Sports Support <${fromAddress}>`,
    DEFAULT_NOTIFY_EMAIL: jssEmail('info'),
    KNOWN_INBOUND_ADDRESSES: inboundDomains.flatMap((d) => INBOUND_LOCAL_PARTS.map((l) => `${l}@${d}`)),
    // Domains our own automated mail comes from: this franchise's, plus Pittsburgh's (current
    // and legacy) since Pittsburgh apps may still mail any support inbox.
    OWN_EMAIL_DOMAINS: [...new Set([emailDomain, PITTSBURGH_EMAIL_DOMAIN, LEGACY_EMAIL_DOMAIN])],
  }
}

const SITE = siteConfig()

export const FRANCHISE = SITE.franchise
export const EMAIL_DOMAIN = SITE.EMAIL_DOMAIN
export const jssEmail = SITE.jssEmail
export const SITE_ORIGIN = SITE.SITE_ORIGIN
export const PUBLIC_WEBSITE_URL = SITE.PUBLIC_WEBSITE_URL
export const PUBLIC_WEBSITE_LABEL = SITE.PUBLIC_WEBSITE_LABEL
export const DEFAULT_FROM_ADDRESS = SITE.DEFAULT_FROM_ADDRESS
export const DEFAULT_FROM = SITE.DEFAULT_FROM
export const DEFAULT_NOTIFY_EMAIL = SITE.DEFAULT_NOTIFY_EMAIL
export const OWN_EMAIL_DOMAINS = SITE.OWN_EMAIL_DOMAINS

// Only ever send from an address we actually control inbound routing for — never trust
// ticket.inbound_address blindly as a From header, even though it's our own worker's data.
export const KNOWN_INBOUND_ADDRESSES = SITE.KNOWN_INBOUND_ADDRESSES

// Replies go out from the address the ticket came in on, else support@ on the franchise domain.
export function replyFromAddress(inboundAddress, site = SITE) {
  return site.KNOWN_INBOUND_ADDRESSES.includes(inboundAddress) ? inboundAddress : site.DEFAULT_FROM_ADDRESS
}
