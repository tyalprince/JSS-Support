import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import AssignDropdown from '../components/AssignDropdown'
import { useActiveStaff } from '../hooks/useTickets'
import { channelLabel } from '../utils/channels'
import { formatDateTime } from '../utils/dates'

const TICKET_SELECT = `*,
  families(primary_parent_first, primary_parent_last, primary_email, primary_phone),
  participants(first_name, last_name),
  programs(name, sport, season),
  partners(name, contact_email, contact_phone),
  assigned_staff:staff!assigned_staff_id(id, first_name, last_name)`

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }
}

export default function TicketDetail({ id }) {
  const { staff, isManagement } = useAuth()
  const staffOptions = useActiveStaff()

  const [ticket, setTicket] = useState(null)
  const [thread, setThread] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [replyText, setReplyText] = useState('')
  const [isAiDraft, setIsAiDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [sendWarning, setSendWarning] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t, error: tErr }, { data: m, error: mErr }] = await Promise.all([
      supabase.from('support_tickets').select(TICKET_SELECT).eq('id', id).maybeSingle(),
      supabase.from('ticket_messages').select('*, sender_staff:staff!sender_id(first_name, last_name)').eq('ticket_id', id).order('created_at', { ascending: true }),
    ])
    if (tErr) setError(tErr.message)
    else if (mErr) setError(mErr.message)
    else { setError(''); setTicket(t); setThread(m || []) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function setStatus(status) {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id)
    if (error) { alert(error.message); return }
    load()
  }

  async function handleDraft() {
    setDrafting(true)
    setSendWarning('')
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/tickets/${id}/draft`, { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to draft reply')
      setReplyText(data.draft || '')
      setIsAiDraft(true)
    } catch (e) {
      setSendWarning(e.message)
    }
    setDrafting(false)
  }

  async function handleSend() {
    if (!replyText.trim()) return
    setSending(true)
    setSendWarning('')
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/tickets/${id}/reply`, {
        method: 'POST', headers, body: JSON.stringify({ body: replyText, ai_generated: isAiDraft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reply')
      if (data.warning) setSendWarning(data.warning)
      setReplyText('')
      setIsAiDraft(false)
      load()
    } catch (e) {
      setSendWarning(e.message)
    }
    setSending(false)
  }

  if (loading) return <div className="page"><div className="loading-state">Loading…</div></div>
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>
  if (!ticket) return <div className="page"><div className="error-banner">Ticket not found.</div></div>

  const canReopen = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back</Link>
      <div className="ticket-detail-header">
        <div>
          <h1 className="page-title">{ticket.subject || '(no subject)'}</h1>
          <div className="ticket-meta">
            {channelLabel(ticket.channel)} · <StatusBadge status={ticket.status} /> · <PriorityBadge priority={ticket.priority} />
            {ticket.due_at && <> · Due {formatDateTime(ticket.due_at)}</>}
          </div>
          {ticket.families && <div className="ticket-context">Family: {ticket.families.primary_parent_first} {ticket.families.primary_parent_last}</div>}
          {ticket.participants && <div className="ticket-context">Participant: {ticket.participants.first_name} {ticket.participants.last_name}</div>}
          {ticket.programs && <div className="ticket-context">Program: {ticket.programs.name}</div>}
          {ticket.partners && <div className="ticket-context">Partner: {ticket.partners.name}</div>}
        </div>
        <div className="ticket-assign">
          <label>Assigned to</label>
          <AssignDropdown ticket={ticket} staffOptions={staffOptions} onAssigned={load} />
        </div>
      </div>

      <div className="status-controls">
        {!isManagement && <span className="status-note">Only management can change status or reassign.</span>}
        {ticket.status === 'open' && <button disabled={!isManagement} onClick={() => setStatus('in_progress')}>Mark in progress</button>}
        {(ticket.status === 'open' || ticket.status === 'in_progress') && <button disabled={!isManagement} onClick={() => setStatus('resolved')}>Resolve</button>}
        {ticket.status !== 'closed' && <button disabled={!isManagement} onClick={() => setStatus('closed')}>Close</button>}
        {canReopen && <button disabled={!isManagement} onClick={() => setStatus('open')}>Reopen</button>}
      </div>

      <div className="thread">
        <div className={`thread-message thread-${ticket.channel}`}>
          <div className="thread-message-meta">Original message · {formatDateTime(ticket.created_at)}</div>
          <div className="thread-message-body">{ticket.body}</div>
        </div>
        {thread.map(m => (
          <div key={m.id} className={`thread-message thread-${m.sender_type}`}>
            <div className="thread-message-meta">
              {m.sender_type === 'staff' ? (m.sender_staff ? `${m.sender_staff.first_name} ${m.sender_staff.last_name}` : 'Staff') : m.sender_type}
              {m.ai_generated && <span className="ai-tag">AI drafted</span>}
              {' · '}{formatDateTime(m.created_at)}
            </div>
            <div className="thread-message-body">{m.body}</div>
          </div>
        ))}
      </div>

      <div className="reply-box">
        {sendWarning && <div className="error-banner">{sendWarning}</div>}
        <textarea
          value={replyText}
          onChange={e => { setReplyText(e.target.value); if (!e.target.value) setIsAiDraft(false) }}
          placeholder="Write a reply…"
          rows={5}
        />
        {isAiDraft && <div className="ai-draft-note">AI draft — review before sending</div>}
        <div className="reply-actions">
          <button onClick={handleDraft} disabled={drafting}>{drafting ? 'Drafting…' : 'Draft with AI'}</button>
          <button className="primary" onClick={handleSend} disabled={sending || !replyText.trim()}>{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </div>
  )
}
