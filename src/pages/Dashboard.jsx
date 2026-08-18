import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { useTickets, useActiveStaff } from '../hooks/useTickets'
import TicketFilters from '../components/TicketFilters'
import TicketTable from '../components/TicketTable'
import { TIER_1_CHANNELS, TIER_2_CHANNELS } from '../utils/channels'
import { isOverdue } from '../utils/dates'

export default function Dashboard() {
  const { staff } = useAuth()
  const { filters, setFilter, toggleMine } = useTicketFilters(null)
  const { tickets, loading, error, reload } = useTickets(filters, staff?.id)
  const staffOptions = useActiveStaff()
  const [overdueOpen, setOverdueOpen] = useState(true)

  const overdue = tickets.filter(isOverdue)
  const tier1 = tickets.filter(t => TIER_1_CHANNELS.includes(t.channel))
  const tier2 = tickets.filter(t => TIER_2_CHANNELS.includes(t.channel))

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <TicketFilters filters={filters} setFilter={setFilter} toggleMine={toggleMine} staffOptions={staffOptions} />
      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-state">Loading…</div>}

      {!loading && (
        <>
          <section className="ticket-section overdue-section">
            <button className="section-header overdue-header" onClick={() => setOverdueOpen(o => !o)}>
              <span>{overdueOpen ? '▾' : '▸'} Overdue</span>
              <span className="count-badge count-badge-overdue">{overdue.length}</span>
            </button>
            {overdueOpen && <TicketTable tickets={overdue} staffOptions={staffOptions} onChanged={reload} emptyLabel="Nothing overdue." />}
          </section>

          <section className="ticket-section">
            <div className="section-header">Tier 1 — Immediate (Prospect · Program · Camp)</div>
            <TicketTable tickets={tier1} staffOptions={staffOptions} onChanged={reload} />
          </section>

          <section className="ticket-section">
            <div className="section-header">Tier 2 — Standard (Franchise · Team · Hiring · Partner)</div>
            <TicketTable tickets={tier2} staffOptions={staffOptions} onChanged={reload} />
          </section>
        </>
      )}
    </div>
  )
}
