import { useParams } from 'react-router-dom'
import { CHANNEL_KEYS } from '../utils/channels'
import ChannelTab from './ChannelTab'
import TicketDetail from './TicketDetail'

// /tickets/:key resolves to either a channel tab (prospect, program, camp, ...) or a
// single ticket's detail page (uuid), matching the flat /tickets/[id] route in the spec.
export default function TicketsRoute() {
  const { key } = useParams()
  return CHANNEL_KEYS.includes(key) ? <ChannelTab channel={key} /> : <TicketDetail id={key} />
}
