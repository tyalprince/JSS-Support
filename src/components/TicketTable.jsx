import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import AssignDropdown from './AssignDropdown'
import { channelLabel } from '../utils/channels'
import { timeUntil, isOverdue, formatDate, daysUnresolved } from '../utils/dates'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Bulk delete is gated to management the same way reassignment is (support_tickets RLS only
// grants delete to management), so there's no server-side check to add here — the direct
// client delete already fails closed for everyone else.
export default function TicketTable({ tickets, staffOptions, onChanged, emptyLabel }) {
  const { isManagement } = useAuth()
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  if (!tickets.length) return <div className="empty-state">{emptyLabel || 'No tickets match these filters.'}</div>

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => (prev.size === tickets.length ? new Set() : new Set(tickets.map(t => t.id))))
  }

  async function handleDelete() {
    const count = selected.size
    if (!count) return
    if (!confirm(`Permanently delete ${count} ticket${count === 1 ? '' : 's'} and all of their messages? This can't be undone.`)) return

    setDeleting(true)
    const { error } = await supabase.from('support_tickets').delete().in('id', [...selected])
    setDeleting(false)
    if (error) { alert(error.message); return }
    setSelected(new Set())
    onChanged?.()
  }

  return (
    <>
      {isManagement && selected.size > 0 && (
        <div className="bulk-actions-bar">
          <span>{selected.size} selected</span>
          <button type="button" onClick={() => setSelected(new Set())}>Clear</button>
          <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete selected'}
          </button>
        </div>
      )}
      <div className="ticket-table-wrap">
        <table className="ticket-table">
          <thead>
            <tr>
              {isManagement && (
                <th className="select-col">
                  <input
                    type="checkbox"
                    checked={selected.size === tickets.length}
                    onChange={toggleAll}
                    aria-label="Select all tickets"
                  />
                </th>
              )}
              <th>Subject</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned</th>
              <th>Created</th>
              <th>Days Unresolved</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} className={isOverdue(t) ? 'row-overdue' : ''}>
                {isManagement && (
                  <td className="select-col">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      aria-label={`Select ${t.subject || 'ticket'}`}
                    />
                  </td>
                )}
                <td>
                  <Link to={`/tickets/${t.id}`} className="row-subject">{t.subject || '(no subject)'}</Link>
                  <div className="row-preview">{(t.body || '').slice(0, 90)}</div>
                </td>
                <td>{channelLabel(t.channel)}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td><AssignDropdown ticket={t} staffOptions={staffOptions} onAssigned={onChanged} /></td>
                <td>{formatDate(t.created_at)}</td>
                <td>{daysUnresolved(t)}d</td>
                <td className={isOverdue(t) ? 'due-overdue' : ''}>{t.due_at ? timeUntil(t.due_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
