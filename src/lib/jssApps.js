// Cross-app switcher: the JSS apps a manager can jump between.
// Kept identical in every JSS app repo (CRM, Staff Portal, Support, Vendor,
// Accounting, Registration, Family Portal) — change it everywhere together.
//
// Sibling URLs are derived from this app's own hostname, so a franchise's
// deployments link to each other with no configuration:
//   jss-crm-pittsburgh.vercel.app -> jss-staffing-pittsburgh.vercel.app, ...
//   jss-crm-sandbox.vercel.app    -> jss-staffing-sandbox.vercel.app, ...
// Anything else (localhost, previews, custom domains) falls back to Pittsburgh.
// An optional JSON override ({"crm":"https://...", ...}) wins over both.

export const JSS_HUB_URL = 'https://jss-hub.vercel.app'

export const JSS_APPS = [
  { key: 'hub', label: 'App Hub', note: 'All franchises' },
  { key: 'crm', label: 'CRM', slug: 'crm' },
  { key: 'staff_portal', label: 'Staff Portal', slug: 'staffing' },
  { key: 'registration', label: 'Registration', slug: 'registration' },
  { key: 'family_portal', label: 'Family Portal', slug: 'family-portal' },
  { key: 'vendor_portal', label: 'Vendor Portal', slug: 'vendor' },
  { key: 'accounting', label: 'Accounting', slug: 'accounting' },
  { key: 'support', label: 'Support', slug: 'support' },
  { key: 'hiring', label: 'Hiring', slug: 'hiring' },
]

const SLUGS = JSS_APPS.filter((a) => a.slug).map((a) => a.slug).join('|')
const HOST_RE = new RegExp(`^jss-(?:${SLUGS})-([a-z0-9]+)\\.vercel\\.app$`)

/** Franchise suffix of a JSS production hostname, defaulting to pittsburgh. */
export function franchiseFromHost(hostname) {
  const m = HOST_RE.exec(String(hostname || '').toLowerCase())
  return m ? m[1] : 'pittsburgh'
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
    url: over[a.key] || (a.key === 'hub' ? JSS_HUB_URL : `https://jss-${a.slug}-${franchise}.vercel.app`),
  }))
}
