// Top-right "Apps" menu for managers and admins: quick links to the other JSS
// apps. Visibility comes from the database (public.jss_is_app_admin(): active
// staff with is_management or the Admin role), so every app agrees on who
// sees it. Kept identical across the JSS repos — see jssApps.js.
import { useEffect, useRef, useState } from 'react'
import { jssAppLinks } from '../lib/jssApps.js'

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export default function AppSwitcher({ current, supabase, tone = 'light', overrides }) {
  const [allowed, setAllowed] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!supabase) return undefined
    let live = true
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (live) setAllowed(false); return }
        const { data, error } = await supabase.rpc('jss_is_app_admin')
        if (live) setAllowed(!error && data === true)
      } catch {
        if (live) setAllowed(false)
      }
    }
    check()
    // Don't await Supabase calls inside the auth callback (it can deadlock).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(check, 0)
    })
    return () => { live = false; sub?.subscription?.unsubscribe() }
  }, [supabase])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!allowed) return null
  const links = jssAppLinks(current, typeof window !== 'undefined' ? window.location.hostname : '', overrides)
  const dark = tone === 'dark'

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch app"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.35)' : '#d6dbe8'}`,
          background: dark ? 'rgba(255,255,255,0.08)' : '#fff', color: dark ? '#fff' : '#1a2340',
          font: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1.2, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <GridIcon /> Apps
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 1000, width: 230,
            maxWidth: 'calc(100vw - 24px)', background: '#fff', color: '#1a2340', border: '1px solid #dde2f0',
            borderRadius: 10, boxShadow: '0 10px 30px rgba(16,24,40,0.18)', padding: 6, textAlign: 'left',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' }}>
            Jump to app
          </div>
          {links.map((l) => (
            <a
              key={l.key}
              role="menuitem"
              href={l.url}
              onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '8px 10px', borderRadius: 7, color: '#1a2340', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f2f8' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {l.label}
              {l.note && <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#6b7280' }}>{l.note}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
