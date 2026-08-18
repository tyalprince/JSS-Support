import { useEffect, useState } from 'react'
import { CHANNELS, STATUSES, PRIORITIES } from '../utils/channels'

export default function TicketFilters({ filters, setFilter, toggleMine, lockChannel, staffOptions }) {
  const [q, setQ] = useState(filters.q)

  useEffect(() => { setQ(filters.q) }, [filters.q])
  useEffect(() => {
    const t = setTimeout(() => { if (q !== filters.q) setFilter('q', q) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="filters-bar">
      <input
        className="filters-search"
        placeholder="Search subject & body…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {!lockChannel && (
        <select value={filters.channel} onChange={e => setFilter('channel', e.target.value)}>
          <option value="">All channels</option>
          {CHANNELS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      )}
      <select value={filters.assigned} onChange={e => setFilter('assigned', e.target.value)}>
        <option value="">Any staff</option>
        {staffOptions.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
      </select>
      <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} title="Created from" />
      <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} title="Created to" />
      <label className="filters-mine">
        <input type="checkbox" checked={filters.mine} onChange={toggleMine} /> Assigned to me
      </label>
    </div>
  )
}
