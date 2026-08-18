import { useAuth } from '../lib/AuthContext'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { useTickets, useActiveStaff } from '../hooks/useTickets'
import TicketFilters from '../components/TicketFilters'
import TicketTable from '../components/TicketTable'
import { channelLabel, CHANNEL_KEYS } from '../utils/channels'

export default function ChannelTab({ channel }) {
  const { staff } = useAuth()
  const { filters, setFilter, toggleMine } = useTicketFilters(channel)
  const { tickets, loading, error, reload } = useTickets(filters, staff?.id)
  const staffOptions = useActiveStaff()

  if (!CHANNEL_KEYS.includes(channel)) {
    return <div className="page"><div className="error-banner">Unknown channel: {channel}</div></div>
  }

  return (
    <div className="page">
      <h1 className="page-title">{channelLabel(channel)} Tickets</h1>
      <TicketFilters filters={filters} setFilter={setFilter} toggleMine={toggleMine} staffOptions={staffOptions} lockChannel />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="loading-state">Loading…</div> : (
        <TicketTable tickets={tickets} staffOptions={staffOptions} onChanged={reload} />
      )}
    </div>
  )
}
