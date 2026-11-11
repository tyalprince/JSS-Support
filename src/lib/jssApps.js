// Cross-app switcher: the JSS apps a manager can jump between.
// Kept identical in every JSS app repo (CRM, Staff Portal, Support, Vendor,
// Accounting, Registration, Family Portal) — change it everywhere together.
//
// A franchise with its own domain (FRANCHISE_DOMAINS) links to its custom
// subdomains; any other franchise links to its Vercel deployments:
//   crm.jumpstartsportspittsburgh.com -> staff.jumpstartsportspittsburgh.com, ...
//   jss-crm-pittsburgh.vercel.app     -> staff.jumpstartsportspittsburgh.com, ...
//   jss-crm-sandbox.vercel.app        -> jss-staffing-sandbox.vercel.app, ...
// Anything else (localhost, previews) falls back to Pittsburgh.
// An optional JSON override ({"crm":"https://...", ...}) wins over all of these.

export const JSS_HUB_URL = 'https://jss-hub.vercel.app'

/** Franchises served from their own domain, and that domain. */
export const FRANCHISE_DOMAINS = { pittsburgh: 'jumpstartsportspittsburgh.com' }

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

/** Franchise of a JSS production hostname, defaulting to pittsburgh. */
export function franchiseFromHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  const m = HOST_RE.exec(host)
  if (m) return m[1]
  for (const [franchise, domain] of Object.entries(FRANCHISE_DOMAINS)) {
    if (host === domain || host.endsWith(`.${domain}`)) return franchise
  }
  return 'pittsburgh'
}

/** Production URL of one JSS app (by key, e.g. 'family_portal') for a franchise. */
export function jssAppUrl(key, franchise = 'pittsburgh') {
  if (key === 'hub') return JSS_HUB_URL
  const app = ALL_APPS.find((a) => a.key === key)
  if (!app || !app.slug) return null
  const domain = FRANCHISE_DOMAINS[franchise]
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
 */
export function jssAppLinks(current, hostname, overrides) {
  const franchise = franchiseFromHost(hostname)
  const over = parseOverrides(overrides)
  return JSS_APPS.filter((a) => a.key !== current).map((a) => ({
    key: a.key,
    label: a.label,
    note: a.note || null,
    url: over[a.key] || jssAppUrl(a.key, franchise),
  }))
}
