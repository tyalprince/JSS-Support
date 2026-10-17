import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { CHANNELS } from '../utils/channels'
import AppSwitcher from './AppSwitcher.jsx'
import { AccountButton } from './AccountCenter.jsx'
import { supabase } from '../lib/supabaseClient.js'

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {open
        ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>
        : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
    </svg>
  )
}

export default function Layout() {
  const { staff, signOut, isManagement } = useAuth()
  const location = useLocation()
  // Phones only: nav + user controls collapse behind the menu button (CSS hides the
  // button and always shows the nav at wider widths, so desktop is unchanged).
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const navClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link'

  return (
    <div className="app-shell">
      <header className={menuOpen ? 'app-header menu-open' : 'app-header'}>
        <div className="app-header-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AccountButton supabase={supabase} appName="Support" compact />
          <img src="/brand/jss-logo-white.png" alt="Jump Start Sports" className="app-header-logo" />
          Support
        </div>
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen(o => !o)}
          aria-expanded={menuOpen}
          aria-controls="app-header-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <MenuIcon open={menuOpen} />
        </button>
        <div className="app-header-menu" id="app-header-menu">
          <nav className="app-nav">
            <NavLink to="/" end className={navClass}>Dashboard</NavLink>
            {CHANNELS.map(c => (
              <NavLink key={c.key} to={`/tickets/${c.key}`} className={navClass}>
                {c.label}
              </NavLink>
            ))}
            {isManagement && (
              <NavLink to="/settings" className={navClass}>Settings</NavLink>
            )}
          </nav>
          <div className="app-header-user">
            <AppSwitcher current="support" supabase={supabase} tone="dark" overrides={import.meta.env.VITE_JSS_APP_LINKS} />
            <span>{staff ? `${staff.first_name} ${staff.last_name}` : ''}</span>
            <button className="signout-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
