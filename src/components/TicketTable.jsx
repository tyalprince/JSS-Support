import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import AssignDropdown from './AssignDropdown'
import { channelLabel } from '../utils/channels'
import { timeUntil, isOverdue } from '../utils/dates'

export default function TicketTable({ tickets, staffOptions, onChanged, emptyLabel }) {
  if (!tickets.length) return <div className="empty-state">{emptyLabel || 'No tickets match these filters.'}</div>

  return (
    <table className="ticket-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Channel</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Assigned</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map(t => (
          <tr key={t.id} className={isOverdue(t) ? 'row-overdue' : ''}>
            <td>
              <Link to={`/tickets/${t.id}`} className="row-subject">{t.subject || '(no subject)'}</Link>
              <div className="row-preview">{(t.body || '').slice(0, 90)}</div>
            </td>
            <td>{channelLabel(t.channel)}</td>
            <td><StatusBadge status={t.status} /></td>
            <td><PriorityBadge priority={t.priority} /></td>
            <td><AssignDropdown ticket={t} staffOptions={staffOptions} onAssigned={onChanged} /></td>
            <td className={isOverdue(t) ? 'due-overdue' : ''}>{t.due_at ? timeUntil(t.due_at) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
