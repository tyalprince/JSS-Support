'use client'
// "My account" for every JSS staff app: the clickable avatar + name in the
// top-left, and the window it opens (Profile, Security, and — for management
// and admins — Company Details). Kept identical across the JSS repos; change
// it everywhere together.
//
// Usage: <AccountButton supabase={client} appName="CRM" />
//   supabase  a Supabase client, or a function returning one (Next.js apps)
//   tone      'dark' (navy sidebar, default) | 'light'
//   compact   true for a small avatar-only trigger (headers)
//   fallback  what to show until the user has loaded (e.g. the app's old logo)
//
// Data: the signed-in user's own `staff` row (self-update is allowed by RLS)
// plus auth user_metadata, so people without a staff row (e.g. vendor
// partners) still get a profile. Company Details edits the franchise's single
// `company_details` row; who may see/edit it is decided by the database
// (public.jss_is_app_admin()).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const NAVY = '#1a2340'
const RED = '#c8202f'
const MUTED = '#6b7280'
const BORDER = '#dde2f0'

const TIMEZONES = [
  ['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'], ['America/Anchorage', 'Alaska'], ['Pacific/Honolulu', 'Hawaii'],
]
const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

// Company Details fields, by section: [column, label, type?, hint?]
const COMPANY_SECTIONS = [
  ['Brand', [
    ['dba', 'Business name (shown to families)', 'text', 'e.g. Jump Start Sports Pittsburgh'],
    ['legal_name', 'Legal name'],
    ['tagline', 'Tagline'],
    ['website', 'Website', 'url'],
  ]],
  ['Contact', [
    ['phone', 'Main phone', 'tel'],
    ['email', 'Main email', 'email'],
    ['support_email', 'Reply-to / support email', 'email', 'Where families’ replies should go'],
    ['address', 'Business address', 'text', 'Street, city, state ZIP — appears in email footers'],
    ['state', 'State', 'state', 'Also sets which state’s payroll rules the Staff Portal uses'],
    ['timezone', 'Time zone', 'tz'],
  ]],
  ['Online', [
    ['facebook_url', 'Facebook page', 'url'],
    ['instagram_url', 'Instagram', 'url'],
    ['review_url', 'Google review link', 'url'],
  ]],
  ['Legal', [
    ['entity_type', 'Entity type', 'text', 'e.g. LLC'],
    ['ein', 'Federal EIN'],
  ]],
]
const COMPANY_COLUMNS = COMPANY_SECTIONS.flatMap(([, f]) => f.map((x) => x[0])).concat('logo_url')

const resolve = (sb) => (typeof sb === 'function' ? sb() : sb)
const initials = (name, email) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  return String(email || '?')[0].toUpperCase()
}
const isRecoveryUrl = () => typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search)

function Avatar({ url, name, email, size = 36, ring }) {
  const style = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: RED, color: '#fff',
    fontWeight: 700, fontSize: Math.round(size * 0.38), border: ring ? '2px solid rgba(255,255,255,.85)' : 'none',
  }
  return (
    <span style={style} aria-hidden="true">
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name, email)}
    </span>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8,
  font: 'inherit', fontSize: 15, color: NAVY, background: '#fff',
}
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 4 }
const btn = (primary, danger) => ({
  padding: '10px 16px', borderRadius: 8, font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  border: primary ? 'none' : `1px solid ${danger ? '#fca5a5' : BORDER}`,
  background: primary ? NAVY : '#fff', color: primary ? '#fff' : danger ? '#b91c1c' : NAVY,
})

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12, color: MUTED, marginTop: 4 }}>{hint}</span>}
    </label>
  )
}

function Notice({ msg }) {
  if (!msg) return null
  const ok = msg.type === 'ok'
  return (
    <div role="status" style={{ margin: '0 0 14px', padding: '10px 12px', borderRadius: 8, fontSize: 14,
      background: ok ? '#ecfdf5' : '#fef2f2', color: ok ? '#065f46' : '#991b1b', border: `1px solid ${ok ? '#a7f3d0' : '#fecaca'}` }}>
      {msg.text}
    </div>
  )
}

async function uploadPublic(client, file, path) {
  const { error } = await client.storage.from('staff-docs').upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  return client.storage.from('staff-docs').getPublicUrl(path).data.publicUrl
}

function ProfileTab({ client, me, reload }) {
  const [form, setForm] = useState({ first_name: me.first_name, last_name: me.last_name, phone: me.phone })
  const [email, setEmail] = useState(me.email)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  const saveProfile = async (patch) => {
    const full_name = [patch.first_name ?? form.first_name, patch.last_name ?? form.last_name].filter(Boolean).join(' ').trim()
    const meta = { ...patch, full_name: full_name || null }
    if ('photo_url' in patch) meta.avatar_url = patch.photo_url
    const { error } = await client.auth.updateUser({ data: meta })
    if (error) throw new Error(error.message)
    if (me.staffId) {
      const { error: e2 } = await client.from('staff').update(patch).eq('id', me.staffId)
      if (e2) throw new Error(e2.message)
    }
  }

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      await saveProfile({ first_name: form.first_name?.trim() || null, last_name: form.last_name?.trim() || null, phone: form.phone?.trim() || null })
      setMsg({ type: 'ok', text: 'Profile saved.' })
      reload()
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) { setMsg({ type: 'err', text: 'Please choose an image file.' }); return }
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'err', text: 'Photos must be under 5 MB.' }); return }
    setBusy(true); setMsg(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const url = await uploadPublic(client, file, `avatars/${me.userId}/${Date.now()}.${ext}`)
      await saveProfile({ photo_url: url })
      setMsg({ type: 'ok', text: 'Photo updated.' })
      reload()
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  const onRemovePhoto = async () => {
    setBusy(true); setMsg(null)
    try { await saveProfile({ photo_url: null }); reload() } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  const onEmail = async (e) => {
    e.preventDefault()
    const next = email.trim().toLowerCase()
    if (!next || next === (me.email || '').toLowerCase()) return
    setBusy(true); setMsg(null)
    const { error } = await client.auth.updateUser({ email: next }, { emailRedirectTo: window.location.origin })
    setBusy(false)
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: `Check ${next} (and your current inbox) for a confirmation link. Your email changes once it's confirmed.` })
  }

  return (
    <div>
      <Notice msg={msg} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <Avatar url={me.photo} name={me.name} email={me.email} size={64} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={btn(false)} disabled={busy} onClick={() => fileRef.current?.click()}>
            {me.photo ? 'Change photo' : 'Add photo'}
          </button>
          {me.photo && <button type="button" style={btn(false)} disabled={busy} onClick={onRemovePhoto}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>
      </div>
      <form onSubmit={onSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0 12px' }}>
          <Field label="First name"><input style={inputStyle} value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} autoComplete="given-name" /></Field>
          <Field label="Last name"><input style={inputStyle} value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} autoComplete="family-name" /></Field>
        </div>
        <Field label="Mobile phone"><input style={inputStyle} type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field>
        <button type="submit" style={btn(true)} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
      <form onSubmit={onEmail} style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
        <Field label="Sign-in email" hint="We'll send a confirmation link before the change takes effect.">
          <input style={inputStyle} type="email" value={email || ''} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <button type="submit" style={btn(false)} disabled={busy || !email || email.trim().toLowerCase() === (me.email || '').toLowerCase()}>Change email</button>
      </form>
      {me.role && <p style={{ marginTop: 18, fontSize: 13, color: MUTED }}>Role: {me.role}{me.isAdmin ? ' · Admin access' : ''}</p>}
    </div>
  )
}

function SecurityTab({ client, me, recovery, onRecovered }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const onChange = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (next.length < 8) { setMsg({ type: 'err', text: 'Use at least 8 characters.' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: "The new passwords don't match." }); return }
    setBusy(true)
    try {
      if (!recovery) {
        const { error: e1 } = await client.auth.signInWithPassword({ email: me.email, password: current })
        if (e1) throw new Error('Your current password is incorrect.')
      }
      const { error } = await client.auth.updateUser({ password: next })
      if (error) throw new Error(error.message)
      setCurrent(''); setNext(''); setConfirm('')
      setMsg({ type: 'ok', text: 'Password updated. It works for every JSS app you sign in to with this email.' })
      if (recovery) onRecovered()
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  const onSendReset = async () => {
    setBusy(true); setMsg(null)
    const { error } = await client.auth.resetPasswordForEmail(me.email, { redirectTo: window.location.origin })
    setBusy(false)
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: `We sent a reset link to ${me.email}.` })
  }

  const onSignOutAll = async () => {
    if (!window.confirm('Sign out of every device and app? You will need to sign in again everywhere.')) return
    setBusy(true)
    await client.auth.signOut({ scope: 'global' })
    window.location.reload()
  }

  return (
    <div>
      <Notice msg={msg} />
      {recovery && <Notice msg={{ type: 'ok', text: 'Choose a new password to finish resetting it.' }} />}
      <form onSubmit={onChange}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 10 }}>Change password</div>
        {!recovery && (
          <Field label="Current password"><input style={inputStyle} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required /></Field>
        )}
        <Field label="New password" hint="At least 8 characters."><input style={inputStyle} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required /></Field>
        <Field label="Confirm new password"><input style={inputStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></Field>
        <button type="submit" style={btn(true)} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
      {!recovery && (
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>Don't know your current password?</div>
          <button type="button" style={btn(false)} disabled={busy} onClick={onSendReset}>Email me a reset link</button>
        </div>
      )}
      <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 6 }}>Sessions</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={btn(false)} disabled={busy} onClick={async () => { await client.auth.signOut(); window.location.reload() }}>Sign out</button>
          <button type="button" style={btn(false, true)} disabled={busy} onClick={onSignOutAll}>Sign out everywhere</button>
        </div>
      </div>
    </div>
  )
}

function CompanyTab({ client }) {
  const [row, setRow] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error } = await client.from('company_details').select('*').limit(1).maybeSingle()
      if (!live) return
      if (error) setMsg({ type: 'err', text: error.message })
      setRow(data || null)
      const f = {}
      for (const c of COMPANY_COLUMNS) f[c] = data?.[c] ?? ''
      setForm(f)
      setLoading(false)
    })()
    return () => { live = false }
  }, [client])

  const save = async (patch) => {
    const payload = { ...patch, updated_at: new Date().toISOString() }
    const q = row?.id
      ? client.from('company_details').update(payload).eq('id', row.id).select('*').maybeSingle()
      : client.from('company_details').insert(payload).select('*').maybeSingle()
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data) throw new Error("Couldn't save — your account may not have permission to edit company details.")
    setRow(data)
  }

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const patch = {}
      for (const c of COMPANY_COLUMNS) if (c !== 'logo_url') patch[c] = String(form[c] ?? '').trim() || null
      await save(patch)
      setMsg({ type: 'ok', text: 'Company details saved for every app.' })
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) { setMsg({ type: 'err', text: 'Please choose an image file.' }); return }
    setBusy(true); setMsg(null)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const url = await uploadPublic(client, file, `company/logo-${Date.now()}.${ext}`)
      await save({ logo_url: url })
      setForm((f) => ({ ...f, logo_url: url }))
      setMsg({ type: 'ok', text: 'Logo updated.' })
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    setBusy(false)
  }

  if (loading) return <p style={{ color: MUTED }}>Loading…</p>

  return (
    <form onSubmit={onSave}>
      <Notice msg={msg} />
      <p style={{ marginTop: 0, fontSize: 13, color: MUTED }}>
        These details belong to this franchise and are shared by all of its apps (CRM, Staff Portal, Registration, emails and more).
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span style={{ width: 64, height: 64, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#f7f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {form.logo_url ? <img src={form.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: MUTED }}>No logo</span>}
        </span>
        <button type="button" style={btn(false)} disabled={busy} onClick={() => fileRef.current?.click()}>{form.logo_url ? 'Change logo' : 'Upload logo'}</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
      </div>
      {COMPANY_SECTIONS.map(([title, fields]) => (
        <fieldset key={title} style={{ border: 0, padding: 0, margin: '0 0 8px' }}>
          <legend style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>{title}</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 12px' }}>
            {fields.map(([col, label, type = 'text', hint]) => (
              <Field key={col} label={label} hint={hint}>
                {type === 'state' ? (
                  <select style={inputStyle} value={form[col] || ''} onChange={(e) => setForm({ ...form, [col]: e.target.value })}>
                    <option value="">—</option>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : type === 'tz' ? (
                  <select style={inputStyle} value={form[col] || ''} onChange={(e) => setForm({ ...form, [col]: e.target.value })}>
                    <option value="">—</option>
                    {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} type={type} value={form[col] || ''} onChange={(e) => setForm({ ...form, [col]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        </fieldset>
      ))}
      <p style={{ fontSize: 13, color: MUTED }}>Payroll, tax accounts and insurance certificates stay in the Staff Portal → Company Details.</p>
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '10px 0 2px' }}>
        <button type="submit" style={btn(true)} disabled={busy}>{busy ? 'Saving…' : 'Save company details'}</button>
      </div>
    </form>
  )
}

/**
 * @param {{ supabase: any, appName?: string, tone?: 'dark' | 'light', compact?: boolean, fallback?: any }} props
 */
export function AccountButton({ supabase, appName = '', tone = 'dark', compact = false, fallback = null }) {
  const [client, setClient] = useState(null)
  const [me, setMe] = useState(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('profile')
  const [recovery, setRecovery] = useState(false)

  useEffect(() => { setClient(resolve(supabase)) }, [supabase])

  const load = useCallback(async () => {
    if (!client) return
    const { data: { user } } = await client.auth.getUser()
    if (!user) { setMe(null); return }
    const [{ data: staffRows }, { data: isAdmin }] = await Promise.all([
      client.from('staff').select('id, first_name, last_name, phone, photo_url, role').eq('auth_user_id', user.id).limit(1),
      client.rpc('jss_is_app_admin'),
    ])
    const s = staffRows?.[0] || null
    const m = user.user_metadata || {}
    const first = s?.first_name ?? m.first_name ?? ''
    const last = s?.last_name ?? m.last_name ?? ''
    setMe({
      userId: user.id,
      staffId: s?.id || null,
      email: user.email || '',
      first_name: first,
      last_name: last,
      name: [first, last].filter(Boolean).join(' ') || m.full_name || '',
      phone: s?.phone ?? m.phone ?? '',
      photo: s?.photo_url || m.avatar_url || null,
      role: s?.role || null,
      isAdmin: isAdmin === true,
    })
  }, [client])

  useEffect(() => {
    if (!client) return undefined
    load()
    if (isRecoveryUrl()) { setRecovery(true); setTab('security'); setOpen(true) }
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setTab('security'); setOpen(true) }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') setTimeout(load, 0)
    })
    return () => sub?.subscription?.unsubscribe()
  }, [client, load])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  if (!me) return fallback
  const dark = tone === 'dark'
  const tabs = [['profile', 'Profile'], ['security', 'Security']].concat(me.isAdmin ? [['company', 'Company Details']] : [])

  return (
    <>
      <button
        type="button"
        onClick={() => { setTab(recovery ? 'security' : 'profile'); setOpen(true) }}
        title="My account"
        aria-label="My account"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: compact ? 'auto' : '100%', padding: compact ? 2 : '4px 0',
          background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: dark ? '#fff' : NAVY,
        }}
      >
        <Avatar url={me.photo} name={me.name} email={me.email} size={compact ? 32 : 42} ring={dark} />
        {!compact && (
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name || me.email}</span>
            <span style={{ display: 'block', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', opacity: 0.7, marginTop: 2 }}>My account{appName ? ` · ${appName}` : ''}</span>
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal((
        // Rendered on <body>: the trigger usually sits in a sidebar whose
        // transform/overflow would otherwise trap a position:fixed overlay.
        <div
          role="dialog"
          aria-modal="true"
          aria-label="My account"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 2147482000, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px 12px', overflowY: 'auto' }}
        >
          <div style={{ width: '100%', maxWidth: 620, background: '#fff', color: NAVY, borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.25)', marginTop: 24, fontFamily: 'inherit', fontSize: 15, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 0' }}>
              <Avatar url={me.photo} name={me.name} email={me.email} size={44} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name || 'My account'}</div>
                <div style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.email}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ border: 0, background: 'transparent', fontSize: 26, lineHeight: 1, color: MUTED, cursor: 'pointer', padding: 4 }}>×</button>
            </div>
            <div role="tablist" style={{ display: 'flex', gap: 4, padding: '14px 20px 0', borderBottom: `1px solid ${BORDER}`, overflowX: 'auto' }}>
              {tabs.map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  style={{ padding: '8px 12px', border: 0, borderBottom: `3px solid ${tab === k ? RED : 'transparent'}`, background: 'transparent', font: 'inherit', fontSize: 14, fontWeight: tab === k ? 700 : 500, color: tab === k ? NAVY : MUTED, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ padding: 20 }}>
              {tab === 'profile' && <ProfileTab key={me.userId} client={client} me={me} reload={load} />}
              {tab === 'security' && <SecurityTab client={client} me={me} recovery={recovery} onRecovered={() => setRecovery(false)} />}
              {tab === 'company' && me.isAdmin && <CompanyTab client={client} />}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}

export default AccountButton
