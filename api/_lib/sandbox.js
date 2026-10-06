// Sandbox safety guards (server-side only).
//
// SANDBOX_MODE=true  -> never message real people or charge real cards:
//   * SMS  : provider is NOT called; a success-shaped response is returned.
//   * Email: only addresses in SANDBOX_EMAIL_ALLOWLIST (comma-separated exact
//            addresses or @domains) are sent; subjects get a "[SANDBOX] " prefix.
//            Unset/empty allowlist = send nothing.
//   * Stripe: refuses to run with a live key (sk_live / rk_live).
// SANDBOX_MODE unset/false -> every helper is a plain pass-through to fetch().

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])

export function isSandboxMode(env = process.env) {
  return TRUE_VALUES.has(String(env.SANDBOX_MODE || '').trim().toLowerCase())
}

export function parseEmailAllowlist(env = process.env) {
  return String(env.SANDBOX_EMAIL_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Pull the bare address out of "Name <a@b.com>" or "a@b.com". */
function bareAddress(value) {
  const s = String(value || '').trim()
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).trim().toLowerCase()
}

export function isEmailAllowed(address, allowlist) {
  const addr = bareAddress(address)
  return allowlist.some(entry =>
    entry.startsWith('@') ? addr.endsWith(entry) : addr === entry)
}

const toArray = v => (v == null ? [] : Array.isArray(v) ? v : [v])

/**
 * Apply sandbox rules to a Resend payload.
 * Returns { skip, payload, dropped }. Pure; exported for tests.
 */
export function applySandboxEmailRules(payload, env = process.env) {
  const allowlist = parseEmailAllowlist(env)
  const keep = list => toArray(list).filter(a => isEmailAllowed(a, allowlist))
  const to = keep(payload.to)
  const dropped = toArray(payload.to).length - to.length
  const next = { ...payload, to, subject: `[SANDBOX] ${payload.subject ?? ''}` }
  if (payload.cc) next.cc = keep(payload.cc)
  if (payload.bcc) next.bcc = keep(payload.bcc)
  if (!to.length) return { skip: true, payload: next, dropped }
  return { skip: false, payload: next, dropped }
}

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

/** Drop-in for fetch('https://api.resend.com/emails', init). */
export async function resendFetch(url, init = {}) {
  if (!isSandboxMode()) return fetch(url, init)
  let payload
  try { payload = JSON.parse(init.body) } catch { payload = null }
  if (!payload) {
    console.log('[sandbox] email skipped (unparseable payload)')
    return jsonResponse({ id: 'sandbox-skipped' })
  }
  const { skip, payload: next, dropped } = applySandboxEmailRules(payload)
  if (skip) {
    console.log(`[sandbox] email skipped: ${dropped} recipient(s) not in SANDBOX_EMAIL_ALLOWLIST`)
    return jsonResponse({ id: 'sandbox-skipped' })
  }
  if (dropped) console.log(`[sandbox] email: dropped ${dropped} recipient(s) not in SANDBOX_EMAIL_ALLOWLIST`)
  return fetch(url, { ...init, body: JSON.stringify(next) })
}

/** Drop-in for fetch('https://api.telnyx.com/v2/messages', init). */
export async function telnyxFetch(url, init = {}) {
  if (!isSandboxMode()) return fetch(url, init)
  console.log('[sandbox] SMS skipped: SANDBOX_MODE is on, Telnyx not called')
  return jsonResponse({ data: { id: 'sandbox-skipped', record_type: 'message' } })
}

/** Throws if SANDBOX_MODE is on and the key is a live Stripe key. */
export function assertStripeKeySafe(key, env = process.env) {
  if (isSandboxMode(env) && /^(sk|rk)_live/.test(String(key || '').trim())) {
    throw new Error('SANDBOX_MODE is on but a live Stripe key (sk_live/rk_live) is configured. Use a test key (sk_test/rk_test) in sandbox.')
  }
}
