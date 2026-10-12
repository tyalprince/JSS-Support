import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { CHANNELS } from '../utils/channels'
import AppSwitcher from './AppSwitcher.jsx'
import { AccountButton } from './AccountCenter.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function Layout() {
  const { staff, signOut, isManagement } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AccountButton supabase={supabase} appName="Support" compact />
          JSS Support
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
          {CHANNELS.map(c => (
            <NavLink key={c.key} to={`/tickets/${c.key}`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {c.label}
            </NavLink>
          ))}
          {isManagement && (
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Settings</NavLink>
          )}
        </nav>
        <div className="app-header-user">
          <AppSwitcher current="support" supabase={supabase} tone="dark" overrides={import.meta.env.VITE_JSS_APP_LINKS} />
          <span>{staff ? `${staff.first_name} ${staff.last_name}` : ''}</span>
          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
