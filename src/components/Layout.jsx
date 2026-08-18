import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { CHANNELS } from '../utils/channels'

export default function Layout() {
  const { staff, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">JSS Support</div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
          {CHANNELS.map(c => (
            <NavLink key={c.key} to={`/tickets/${c.key}`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {c.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header-user">
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
