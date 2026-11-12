// Which franchise this deployment serves, its domains, and the cross-app switcher links.
// Kept identical in every JSS app repo (CRM, Staff Portal, Support, Vendor, Accounting,
// Registration, Family Portal; .ts twins in the Next.js apps) — change it everywhere together.
//
// Per-franchise settings come from each Vercel project's env (JSS-Hub sets them when it
// provisions a franchise). Each name may carry the framework prefix (VITE_ / NEXT_PUBLIC_)
// so the browser bundle can see it:
//   JSS_FRANCHISE     slug, e.g. 'pittsburgh', 'sandbox'
//   JSS_SITE_DOMAIN   the franchise's own domain (apps at crm.<domain>, staff.<domain>, ...);
//                     unset = the franchise's entry in FRANCHISE_DOMAINS, else *.vercel.app
//   JSS_EMAIL_DOMAIN  domain mail is sent from; unset = the site domain, else Pittsburgh's
// With nothing set a deployment is Pittsburgh, exactly as before these settings existed.
//
// The franchise profile (city, brand name, phone, socials, ...) comes from more settings, same
// prefixes: JSS_CITY, JSS_STATE, JSS_BRAND_NAME, JSS_SHORT_NAME, JSS_PHONE, JSS_TIMEZONE,
// JSS_INSTAGRAM, JSS_FACEBOOK_NAME, JSS_CAMP_BOOKING_URL, JSS_LEGAL_NAME. Each unset (or invalid) value falls back
// to Pittsburgh's (FRANCHISE_PROFILES.pittsburgh), so pages and emails never show a blank. A new
// franchise must set them all; JSS-Hub provisioning requires them for production.
//
// App links: a franchise with a domain links to its subdomains, any other franchise to its
// Vercel deployments:
//   crm.jumpstartsportspittsburgh.com -> staff.jumpstartsportspittsburgh.com, ...
//   jss-crm-pittsburgh.vercel.app     -> staff.jumpstartsportspittsburgh.com, ...
//   jss-crm-sandbox.vercel.app        -> jss-staffing-sandbox.vercel.app, ...
// Anything else (localhost, previews) falls back to this deployment's franchise.
// An optional JSON override ({"crm":"https://...", ...}) wins over all of these.

export const JSS_HUB_URL = 'https://jss-hub.vercel.app'

export const DEFAULT_FRANCHISE = 'pittsburgh'

/** Franchises known to be served from their own domain, and that domain. */
export const FRANCHISE_DOMAINS = { pittsburgh: 'jumpstartsportspittsburgh.com' }

/** Profile values shown in pages, emails and AI prompts. Pittsburgh's are the fallback. */
export const FRANCHISE_PROFILES = {
  pittsburgh: {
    city: 'Pittsburgh',
    state: 'PA',
    brandName: 'Jump Start Sports Pittsburgh',
    shortName: 'JSSP',
    phone: '412-265-8267',
    timeZone: 'America/New_York',
    instagram: 'jumpstartsportspgh',
    facebookName: 'Jump Start Sports Pittsburgh',
    campBookingUrl: 'https://jumpstartsportspittsburgh.jumbula.com/',
    // The legal entity that employs staff and signs offer letters and tax forms.
    legalName: 'Steel City Young Athletes LLC',
  },
}

export const JSS_APPS = [
  { key: 'hub', label: 'App Hub', note: 'All franchises' },
  { key: 'crm', label: 'CRM', slug: 'crm', sub: 'crm' },
  { key: 'staff_portal', label: 'Staff Portal', slug: 'staffing', sub: 'staff' },
  { key: 'registration', label: 'Registration', slug: 'registration', sub: 'register' },
  { key: 'family_portal', label: 'Family Portal', slug: 'family-portal', sub: 'portal' },
  { key: 'vendor_portal', label: 'Vendor Portal', slug: 'vendor', sub: 'vendors' },
  { key: 'accounting', label: 'Accounting', slug: 'accounting', sub: 'accounting' },
  { key: 'support', label: 'Support', slug: 'support', sub: 'support' },
  { key: 'hiring', label: 'Hiring', slug: 'hiring', sub: 'jobs' },
]

// Apps that have a deployment per franchise but aren't in the switcher.
const OTHER_APPS = [{ key: 'sponsors', slug: 'sponsors', sub: 'sponsors' }]
const ALL_APPS = [...JSS_APPS, ...OTHER_APPS]

const SLUGS = ALL_APPS.filter((a) => a.slug).map((a) => a.slug).join('|')
const HOST_RE = new RegExp(`^jss-(?:${SLUGS})-([a-z0-9]+)\\.vercel\\.app$`)
const SLUG_RE = /^[a-z0-9]+$/
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

function rawSetting(env, name) {
  const e = env || {}
  for (const k of [`JSS_${name}`, `VITE_JSS_${name}`, `NEXT_PUBLIC_JSS_${name}`]) {
    const v = e[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function setting(env, name) {
  return rawSetting(env, name).toLowerCase()
}

// Profile values end up inside HTML emails and AI prompts: plain text only, no markup.
const TEXT_RE = /^[^<>{}`"\\\u0000-\u001f]{1,80}$/
const PROFILE_RULES = {
  city: ['CITY', (v) => TEXT_RE.test(v)],
  state: ['STATE', (v) => /^[A-Z]{2}$/.test(v)],
  brandName: ['BRAND_NAME', (v) => TEXT_RE.test(v)],
  shortName: ['SHORT_NAME', (v) => /^[A-Za-z0-9]{2,12}$/.test(v)],
  phone: ['PHONE', (v) => /^\+?[0-9(][0-9 ().-]{6,20}$/.test(v)],
  timeZone: ['TIMEZONE', (v) => /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/.test(v)],
  instagram: ['INSTAGRAM', (v) => /^[A-Za-z0-9._]{1,30}$/.test(v)],
  facebookName: ['FACEBOOK_NAME', (v) => TEXT_RE.test(v)],
  campBookingUrl: ['CAMP_BOOKING_URL', (v) => /^https:\/\/[^\s<>"']+$/.test(v)],
  legalName: ['LEGAL_NAME', (v) => TEXT_RE.test(v)],
}

/** The franchise profile from env; each missing or invalid value falls back to Pittsburgh's. */
export function franchiseProfile(env) {
  const base = FRANCHISE_PROFILES[DEFAULT_FRANCHISE]
  const out = {}
  for (const [key, [name, valid]] of Object.entries(PROFILE_RULES)) {
    let v = rawSetting(env, name)
    if (key === 'state') v = v.toUpperCase()
    if (key === 'instagram') v = v.replace(/^@/, '')
    out[key] = v && valid(v) ? v : base[key]
  }
  // A franchise that names itself but not its Facebook page uses its brand name there too.
  if (!rawSetting(env, 'FACEBOOK_NAME') && rawSetting(env, 'BRAND_NAME') && out.brandName !== base.brandName) out.facebookName = out.brandName
  return out
}

/**
 * This deployment's franchise settings.
 * @param {object} env       env vars (process.env, import.meta.env, or a literal object)
 * @param {string} [hostname] request / window hostname, used when JSS_FRANCHISE is unset;
 *                            server code may omit it (Vercel's VERCEL_PROJECT_PRODUCTION_URL is used)
 * @returns {{ slug: string, siteDomain: string|null, emailDomain: string, domains: object, profile: object }}
 *   domains: FRANCHISE_DOMAINS plus this franchise's domain, for host detection and links
 *   profile: franchiseProfile(env) -- city, brand name, phone, time zone, socials, camp booking URL
 */
export function franchiseConfig(env, hostname) {
  const named = setting(env, 'FRANCHISE')
  const host = hostname || String((env || {}).VERCEL_PROJECT_PRODUCTION_URL || '').replace(/^https?:\/\//, '').split('/')[0]
  const slug = SLUG_RE.test(named) ? named : franchiseFromHost(host, FRANCHISE_DOMAINS, DEFAULT_FRANCHISE)
  const site = setting(env, 'SITE_DOMAIN')
  const siteDomain = DOMAIN_RE.test(site) ? site : FRANCHISE_DOMAINS[slug] || null
  const email = setting(env, 'EMAIL_DOMAIN')
  const emailDomain = DOMAIN_RE.test(email) ? email : siteDomain || FRANCHISE_DOMAINS[DEFAULT_FRANCHISE]
  const domains = siteDomain ? { ...FRANCHISE_DOMAINS, [slug]: siteDomain } : { ...FRANCHISE_DOMAINS }
  return { slug, siteDomain, emailDomain, domains, profile: franchiseProfile(env) }
}

/** Franchise of a JSS production hostname, defaulting to `fallback` (pittsburgh). */
export function franchiseFromHost(hostname, domains = FRANCHISE_DOMAINS, fallback = DEFAULT_FRANCHISE) {
  const host = String(hostname || '').toLowerCase()
  const m = HOST_RE.exec(host)
  if (m) return m[1]
  for (const [franchise, domain] of Object.entries(domains || {})) {
    if (domain && (host === domain || host.endsWith(`.${domain}`))) return franchise
  }
  return fallback
}

/** Production URL of one JSS app (by key, e.g. 'family_portal') for a franchise. */
export function jssAppUrl(key, franchise = DEFAULT_FRANCHISE, domains = FRANCHISE_DOMAINS) {
  if (key === 'hub') return JSS_HUB_URL
  const app = ALL_APPS.find((a) => a.key === key)
  if (!app || !app.slug) return null
  const domain = (domains || {})[franchise]
  return domain ? `https://${app.sub}.${domain}` : `https://jss-${app.slug}-${franchise}.vercel.app`
}

function parseOverrides(raw) {
  if (!raw) return {}
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    const out = {}
    for (const [k, url] of Object.entries(v || {})) {
      if (typeof url === 'string' && /^https:\/\/[^\s/@]+(\/[^\s]*)?$/.test(url.trim())) out[k] = url.trim().replace(/\/$/, '')
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Links for the switcher, excluding the app you're in.
 * @param {string} current  this app's key (e.g. 'crm')
 * @param {string} hostname window.location.hostname (or the request host)
 * @param {string|object} [overrides] optional JSON map of app key -> URL
 * @param {object} [config]  franchiseConfig(...) of this deployment; its franchise is the
 *                           fallback for unrecognized hosts and its domain is recognized
 */
export function jssAppLinks(current, hostname, overrides, config) {
  const domains = config?.domains || FRANCHISE_DOMAINS
  const franchise = franchiseFromHost(hostname, domains, config?.slug || DEFAULT_FRANCHISE)
  const over = parseOverrides(overrides)
  return JSS_APPS.filter((a) => a.key !== current).map((a) => ({
    key: a.key,
    label: a.label,
    note: a.note || null,
    url: over[a.key] || jssAppUrl(a.key, franchise, domains),
  }))
}
