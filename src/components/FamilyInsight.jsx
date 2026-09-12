import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDateOnly, formatDateTime } from '../utils/dates'

const REGISTRATION_SELECT = `*,
  programs(name, sport, season, year, program_type),
  program_sessions(label, age_group, day_of_week, start_time, end_time, start_date, end_date, location)`

function money(n) {
  if (n === null || n === undefined) return ''
  return `$${Number(n).toFixed(2)}`
}

// Data is imported from several sources over time, so payment_status shows up in a mix of
// casings/values ("paid", "Paid", "unknown", "Past due", ...) — bucket them into a tone
// instead of trying to badge every literal value.
function paymentStatusTone(status) {
  const s = (status || '').toLowerCase()
  if (['paid', 'overpaid', 'active', 'transferred_in'].includes(s)) return 'resolved'
  if (['unpaid', 'past due'].includes(s)) return 'urgent'
  return 'in_progress'
}

// Subsession detail: prefer the linked program_sessions row, fall back to whatever the
// registration itself carries (older/imported rows don't all have program_session_id set).
function subsessionSummary(reg) {
  const s = reg.program_sessions
  const label = s?.label || reg.session_title || reg.camp_week || '—'
  const timing = [s?.day_of_week || reg.day_of_week, (s?.start_time || reg.start_time) && `${s?.start_time || reg.start_time}–${s?.end_time || reg.end_time || ''}`]
    .filter(Boolean).join(' ')
  const dates = [s?.start_date || reg.session_start_date, s?.end_date || reg.session_end_date]
    .filter(Boolean).map(formatDateOnly).join(' – ')
  const location = s?.location || reg.session_location
  return { label, timing, dates, location, ageGroup: s?.age_group || reg.age_group }
}

function RegistrationTable({ registrations }) {
  if (registrations.length === 0) return <div className="empty-state">No registrations.</div>
  return (
    <table className="ticket-table insight-reg-table">
      <thead>
        <tr>
          <th>Program</th>
          <th>Subsession</th>
          <th>Status</th>
          <th>Paid</th>
          <th>Registered</th>
        </tr>
      </thead>
      <tbody>
        {registrations.map(r => {
          const sub = subsessionSummary(r)
          const program = r.programs
          return (
            <tr key={r.id}>
              <td>
                {program?.name || r.program || '—'}
                {(program?.sport || r.sport) && <div className="row-preview">{program?.sport || r.sport}{(program?.season || r.season) && ` · ${program?.season || r.season}${program?.year || r.year || ''}`}</div>}
              </td>
              <td>
                {sub.label}
                {(sub.timing || sub.dates || sub.location) && (
                  <div className="row-preview">{[sub.timing, sub.dates, sub.location].filter(Boolean).join(' · ')}</div>
                )}
              </td>
              <td>
                {r.payment_status && (() => {
                  const tone = paymentStatusTone(r.payment_status)
                  const cls = tone === 'urgent' ? 'badge-priority-urgent' : `badge-status-${tone}`
                  return <span className={`badge ${cls}`}>{r.payment_status}</span>
                })()}
                {r.cancelled && <span className="badge badge-priority-urgent">cancelled</span>}
              </td>
              <td>{money(r.amount_paid ?? r.tuition)}</td>
              <td>{formatDateTime(r.date_registered) || formatDateOnly(r.registration_date)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function FamilyDetail({ family, participants, registrations }) {
  const regsByParticipant = {}
  for (const r of registrations) {
    (regsByParticipant[r.participant_id] ||= []).push(r)
  }
  const unassigned = registrations.filter(r => !r.participant_id)

  return (
    <>
      {family.banned && (
        <div className="error-banner insight-banned-banner">
          Banned{family.ban_type ? ` (${family.ban_type})` : ''}{family.ban_reason ? `: ${family.ban_reason}` : ''}
        </div>
      )}

      <div className="insight-family-header">
        <div>
          <div className="insight-family-name">
            {family.primary_parent_first} {family.primary_parent_last}
            {family.secondary_parent_first && <> &amp; {family.secondary_parent_first} {family.secondary_parent_last}</>}
          </div>
          <div className="insight-contact-lines">
            {family.primary_email && <div>{family.primary_email}{family.primary_phone && ` · ${family.primary_phone}`}</div>}
            {family.secondary_email && <div>{family.secondary_email}{family.secondary_phone && ` · ${family.secondary_phone}`}</div>}
            {(family.address || family.city) && (
              <div className="insight-address">{[family.address, family.city, family.state, family.zip].filter(Boolean).join(', ')}</div>
            )}
          </div>
        </div>
        <div className="insight-stat-grid">
          {family.loyalty_tier && <div><span className="insight-stat-label">Tier</span>{family.loyalty_tier}</div>}
          <div><span className="insight-stat-label">Seasons</span>{family.total_seasons ?? 0}</div>
          <div><span className="insight-stat-label">Total spend</span>{money(family.total_spend) || '$0.00'}</div>
          {family.first_registered_date && <div><span className="insight-stat-label">Since</span>{formatDateOnly(family.first_registered_date)}</div>}
        </div>
      </div>

      {family.notes && <div className="insight-notes">Note: {family.notes}</div>}

      {participants.length === 0 && unassigned.length === 0 && (
        <div className="empty-state">No participants or registrations on file for this family.</div>
      )}

      {participants.map(p => (
        <div key={p.id} className="insight-participant">
          <div className="insight-participant-name">
            {p.first_name} {p.last_name}
            {(p.age || p.date_of_birth) && <span className="insight-participant-sub"> · {p.age ? `${p.age} yrs` : ''}{p.school_grade ? ` · Grade ${p.school_grade}` : ''}</span>}
          </div>
          <RegistrationTable registrations={regsByParticipant[p.id] || []} />
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="insight-participant">
          <div className="insight-participant-name">Other registrations</div>
          <RegistrationTable registrations={unassigned} />
        </div>
      )}
    </>
  )
}

// Family/registration lookup shown inline on a ticket. Resolves automatically — by the
// ticket's linked family_id when one exists, otherwise by the inbound reporter_email/phone —
// so staff see who's contacting them and what they've registered for without leaving the
// ticket. Falls back to a manual email/phone search only when neither yields a match.
export default function FamilyInsight({ familyId, contact }) {
  const [family, setFamily] = useState(null)
  const [participants, setParticipants] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [open, setOpen] = useState(true)

  async function loadDetails(f) {
    const [{ data: pData, error: pErr }, { data: rData, error: rErr }] = await Promise.all([
      supabase.from('participants').select('*').eq('family_id', f.id),
      supabase.from('registrations').select(REGISTRATION_SELECT).eq('family_id', f.id).order('date_registered', { ascending: false }),
    ])
    if (pErr) { setError(pErr.message); setLoading(false); return }
    if (rErr) { setError(rErr.message); setLoading(false); return }
    setFamily(f)
    setParticipants(pData || [])
    setRegistrations(rData || [])
    setNotFound(false)
    setLoading(false)
  }

  async function runLookup() {
    setLoading(true)
    setError('')
    setFamily(null)
    setNotFound(false)

    if (familyId) {
      const { data: f, error: fErr } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
      if (fErr) { setError(fErr.message); setLoading(false); return }
      if (!f) { setNotFound(true); setLoading(false); return }
      await loadDetails(f)
      return
    }

    if (contact) {
      const { data: matched, error: rpcErr } = await supabase.rpc('search_family_contacts', { p_query: contact })
      if (rpcErr) { setError(rpcErr.message); setLoading(false); return }
      const f = (matched || [])[0]
      if (!f) { setNotFound(true); setLoading(false); return }
      await loadDetails(f)
      return
    }

    setNotFound(true)
    setLoading(false)
  }

  useEffect(() => {
    runLookup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, contact])

  async function handleManualSearch(e) {
    e.preventDefault()
    if (!manualQuery.trim()) return
    setLoading(true)
    setError('')
    const { data: matched, error: rpcErr } = await supabase.rpc('search_family_contacts', { p_query: manualQuery.trim() })
    if (rpcErr) { setError(rpcErr.message); setLoading(false); return }
    const f = (matched || [])[0]
    if (!f) { setFamily(null); setNotFound(true); setLoading(false); return }
    await loadDetails(f)
  }

  return (
    <div className="insight-bubble">
      <button type="button" className="insight-bubble-header" onClick={() => setOpen(o => !o)}>
        <span>{open ? '▾' : '▸'} JSS Insight{family ? ` · ${family.primary_parent_first} ${family.primary_parent_last}` : ''}</span>
        {loading && <span className="insight-bubble-status">Looking up…</span>}
      </button>

      {open && (
        <div className="insight-bubble-body">
          {error && <div className="error-banner">{error}</div>}

          {!loading && notFound && (
            <div className="insight-bubble-empty">
              No family match found{contact ? ` for ${contact}` : ''}.
              <form className="insight-bubble-search" onSubmit={handleManualSearch}>
                <input placeholder="Search a different email or phone…" value={manualQuery} onChange={e => setManualQuery(e.target.value)} />
                <button type="submit" disabled={!manualQuery.trim()}>Search</button>
              </form>
            </div>
          )}

          {family && <FamilyDetail family={family} participants={participants} registrations={registrations} />}
        </div>
      )}
    </div>
  )
}
