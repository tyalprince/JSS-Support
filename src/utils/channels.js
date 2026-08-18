// Single source of truth for the 7 support channels, their tab routes, and dashboard tiering.
export const CHANNELS = [
  { key: 'prospect', label: 'Prospect', tier: 1 },
  { key: 'program', label: 'Program', tier: 1 },
  { key: 'camp', label: 'Camp', tier: 1 },
  { key: 'franchise', label: 'Franchise', tier: 2 },
  { key: 'team', label: 'Team', tier: 2 },
  { key: 'hiring', label: 'Hiring', tier: 2 },
  { key: 'partner', label: 'Partner', tier: 2 },
]

export const CHANNEL_KEYS = CHANNELS.map(c => c.key)
export const TIER_1_CHANNELS = CHANNELS.filter(c => c.tier === 1).map(c => c.key)
export const TIER_2_CHANNELS = CHANNELS.filter(c => c.tier === 2).map(c => c.key)

export function channelLabel(key) {
  return CHANNELS.find(c => c.key === key)?.label || key
}

export const STATUSES = ['open', 'in_progress', 'resolved', 'closed']
export const PRIORITIES = ['urgent', 'high', 'normal', 'low']
