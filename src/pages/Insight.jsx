import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

function FamilyCard({ family, participants, registrations }) {
  const regsByParticipant = {}
  for (const r of registrations) {
    (regsByParticipant[r.participant_id] ||= []).push(r)
  }
  const unassigned = registrations.filter(r => !r.participant_id)

  return (
    <div className="insight-card">
      {family.banned && (
        <div className="error-banner insight-banned-banner">
          Banned{family.ban_type ? ` (${family.ban_type})` : ''}{family.ban_reason ? `: ${family.ban_reason}` : ''}
        </div>
      )}

      <div className="insight-family-header">
        <div>
          <h2 className="insight-family-name">
            {family.primary_parent_first} {family.primary_parent_last}
            {family.secondary_parent_first && <> &amp; {family.secondary_parent_first} {family.secondary_parent_last}</>}
          </h2>
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
    </div>
  )
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

export default function Insight() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [families, setFamilies] = useState(null)
  const [participantsByFamily, setParticipantsByFamily] = useState({})
  const [registrationsByFamily, setRegistrationsByFamily] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const runSearch = useCallback(async (query) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setSearched(true)

    const { data: matched, error: rpcErr } = await supabase.rpc('search_family_contacts', { p_query: trimmed })
    if (rpcErr) { setError(rpcErr.message); setFamilies([]); setLoading(false); return }

    const ids = (matched || []).map(f => f.id)
    let participants = [], registrations = []
    if (ids.length) {
      const [{ data: pData, error: pErr }, { data: rData, error: rErr }] = await Promise.all([
        supabase.from('participants').select('*').in('family_id', ids),
        supabase.from('registrations').select(REGISTRATION_SELECT).in('family_id', ids).order('date_registered', { ascending: false }),
      ])
      if (pErr) { setError(pErr.message); setLoading(false); return }
      if (rErr) { setError(rErr.message); setLoading(false); return }
      participants = pData || []
      registrations = rData || []
    }

    const pByFamily = {}, rByFamily = {}
    for (const p of participants) (pByFamily[p.family_id] ||= []).push(p)
    for (const r of registrations) (rByFamily[r.family_id] ||= []).push(r)

    setFamilies(matched || [])
    setParticipantsByFamily(pByFamily)
    setRegistrationsByFamily(rByFamily)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initialQ) runSearch(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setParams(q ? { q } : {})
    runSearch(q)
  }

  return (
    <div className="page">
      <h1 className="page-title">Insight</h1>
      <p className="insight-intro">Look up a family by the email address or phone number they contacted us from — no need to cross-reference by hand.</p>

      <form className="insight-search-bar" onSubmit={handleSubmit}>
        <input
          className="filters-search"
          placeholder="Email or phone number…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoFocus
        />
        <button type="submit" className="insight-search-btn" disabled={!q.trim() || loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-state">Searching…</div>}

      {!loading && searched && families && families.length === 0 && !error && (
        <div className="empty-state">No family found for “{q}”.</div>
      )}

      {!loading && families && families.length > 0 && (
        <div className="insight-results">
          {families.map(f => (
            <FamilyCard
              key={f.id}
              family={f}
              participants={participantsByFamily[f.id] || []}
              registrations={registrationsByFamily[f.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
