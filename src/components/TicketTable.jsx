import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import AssignDropdown from './AssignDropdown'
import { channelLabel } from '../utils/channels'
import { timeUntil, isOverdue, isDone, formatDate, daysUnresolved } from '../utils/dates'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Bulk delete is gated to management the same way reassignment is (support_tickets RLS only
// grants delete to management), so there's no server-side check to add here — the direct
// client delete already fails closed for everyone else.
export default function TicketTable({ tickets, staffOptions, onChanged, emptyLabel }) {
  const { isManagement } = useAuth()
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)

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

  async function handleComplete() {
    const count = selected.size
    if (!count) return
    if (!confirm(`Mark ${count} ticket${count === 1 ? '' : 's'} complete (closed)? They can be reopened from the ticket page.`)) return

    setCompleting(true)
    const { error } = await supabase.from('support_tickets').update({ status: 'closed' }).in('id', [...selected])
    setCompleting(false)
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
          <button type="button" className="complete" onClick={handleComplete} disabled={completing || deleting}>
            {completing ? 'Completing…' : '✓ Complete'}
          </button>
          <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete selected'}
          </button>
        </div>
      )}
      <div className="ticket-table-wrap">
        <table className="ticket-table ticket-list-table">
          <thead>
            <tr>
              {isManagement && (
                <th className="select-col">
                  <label className="select-all">
                    <input
                      type="checkbox"
                      checked={selected.size === tickets.length}
                      onChange={toggleAll}
                      aria-label="Select all tickets"
                    />
                    <span className="select-all-text">Select all</span>
                  </label>
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
                <td className="cell-subject">
                  <Link to={`/tickets/${t.id}`} className="row-subject">{t.subject || '(no subject)'}</Link>
                  <div className="row-preview">{(t.body || '').slice(0, 90)}</div>
                </td>
                <td data-label="Channel">{channelLabel(t.channel)}</td>
                <td data-label="Status"><StatusBadge status={t.status} /></td>
                <td data-label="Priority"><PriorityBadge priority={t.priority} /></td>
                <td data-label="Assigned"><AssignDropdown ticket={t} staffOptions={staffOptions} onAssigned={onChanged} /></td>
                <td data-label="Created">{formatDate(t.created_at)}</td>
                <td data-label="Days unresolved">{daysUnresolved(t)}d</td>
                <td data-label="Due" className={isOverdue(t) ? 'due-overdue' : ''}>{isDone(t) ? <span className="due-done">{t.status === 'closed' ? 'Closed' : 'Resolved'}</span> : t.due_at ? timeUntil(t.due_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
