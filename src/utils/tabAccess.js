// Per-tab access (staff.tab_access, set from the hub People page). Keys match jss-hub
// lib/people/rules.ts STAFF_APP_TABS.support: 'dashboard', each channel key, and 'settings'
// (Settings also needs management).
//   null / {} / no "support" entry = every tab; support: [] = no Support tabs.
// This only hides tabs; which tickets a person can read is still decided by RLS.
import { CHANNELS } from './channels.js'

export const SUPPORT_TABS = ['dashboard', ...CHANNELS.map((c) => c.key), 'settings']

/** null = every tab, else the Set of allowed Support tabs. */
export function allowedSupportTabs(staff) {
  const access = staff?.tab_access
  if (!access || typeof access !== 'object' || Array.isArray(access)) return null
  const list = access.support
  if (!Array.isArray(list)) return null
  return new Set(SUPPORT_TABS.filter((t) => list.includes(t)))
}

/** Keys outside the tab list (e.g. a ticket id under /tickets/:key) are never limited here. */
export function canOpenTab(staff, tab) {
  if (!SUPPORT_TABS.includes(tab)) return true
  const allowed = allowedSupportTabs(staff)
  return !allowed || allowed.has(tab)
}

/** Path of the first tab this person may open, or null when none. */
export function firstAllowedPath(staff) {
  const allowed = allowedSupportTabs(staff)
  // Settings is management-only, so it's never the landing tab.
  const tab = SUPPORT_TABS.find((t) => t !== 'settings' && (!allowed || allowed.has(t)))
  if (!tab) return null
  return tab === 'dashboard' ? '/' : `/tickets/${tab}`
}
