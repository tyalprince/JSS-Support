import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const FIELD_LABEL = { subject: 'Subject', sender: 'Sender' }

function matches(rule, ticket) {
  const kw = String(rule.keyword || '').trim().toLowerCase()
  if (!kw) return false
  const value = rule.match_field === 'sender' ? ticket.reporter_email : ticket.subject
  return String(value || '').toLowerCase().includes(kw)
}

// Keyword blocker for inbound email: matching emails never become tickets (enforced in
// /api/inbound/email). Management only -- RLS on support_blocked_keywords enforces it too.
export default function SettingsPage() {
  const { isManagement, staff } = useAuth()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [field, setField] = useState('subject')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openMatches, setOpenMatches] = useState([])
  const [closing, setClosing] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data, error }, { data: open }] = await Promise.all([
      supabase.from('support_blocked_keywords').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('id, subject, reporter_email').in('status', ['open', 'in_progress']),
    ])
    if (error) setError(error.message)
    const list = data || []
    setRules(list)
    setOpenMatches((open || []).filter(t => list.some(r => matches(r, t))))
    setLoading(false)
  }

  useEffect(() => { if (isManagement) load() }, [isManagement])

  if (!isManagement) return <div className="page"><div className="empty-state">Settings are available to management only.</div></div>

  async function addRule(e) {
    e.preventDefault()
    const kw = keyword.trim()
    if (!kw) return
    setSaving(true); setError('')
    const { error } = await supabase.from('support_blocked_keywords').insert({ keyword: kw, match_field: field, created_by: staff?.id || null })
    setSaving(false)
    if (error) { setError(error.code === '23505' ? 'That keyword is already blocked.' : error.message); return }
    setKeyword('')
    load()
  }

  async function removeRule(rule) {
    if (!confirm(`Stop blocking "${rule.keyword}"?`)) return
    const { error } = await supabase.from('support_blocked_keywords').delete().eq('id', rule.id)
    if (error) { alert(error.message); return }
    load()
  }

  async function closeMatches() {
    if (!openMatches.length) return
    if (!confirm(`Close ${openMatches.length} open ticket${openMatches.length === 1 ? '' : 's'} that match your blocked keywords?`)) return
    setClosing(true)
    const { error } = await supabase.from('support_tickets').update({ status: 'closed' }).in('id', openMatches.map(t => t.id))
    setClosing(false)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <section className="settings-card">
        <h2>Blocked keywords</h2>
        <p className="settings-help">
          Emails sent to the support inboxes whose <b>subject</b> or <b>sender address</b> contains one of these
          keywords (not case-sensitive) won't create a ticket. Use sender keywords like <code>mac.bid</code> for
          companies whose subjects change every email.
        </p>

        <form className="keyword-form" onSubmit={addRule}>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={field === 'sender' ? 'e.g. mac.bid' : 'e.g. Report Domain:'} />
          <select value={field} onChange={e => setField(e.target.value)} aria-label="Match on">
            <option value="subject">Subject contains</option>
            <option value="sender">Sender contains</option>
          </select>
          <button type="submit" disabled={saving || !keyword.trim()}>{saving ? 'Adding…' : 'Block'}</button>
        </form>
        {error && <div className="error-banner">{error}</div>}

        {loading ? <div className="loading-state">Loading…</div> : rules.length === 0 ? (
          <div className="empty-state">No blocked keywords yet.</div>
        ) : (
          <ul className="keyword-list">
            {rules.map(r => (
              <li key={r.id}>
                <span className="kw-field">{FIELD_LABEL[r.match_field] || r.match_field}</span>
                <span className="kw">{r.keyword}</span>
                <button type="button" onClick={() => removeRule(r)}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        {!loading && openMatches.length > 0 && (
          <div className="keyword-actions">
            <span>{openMatches.length} open ticket{openMatches.length === 1 ? '' : 's'} already match these keywords.</span>
            <button type="button" onClick={closeMatches} disabled={closing}>{closing ? 'Closing…' : 'Close them'}</button>
          </div>
        )}
      </section>
    </div>
  )
}
