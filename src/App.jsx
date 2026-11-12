import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { canOpenTab, firstAllowedPath } from './utils/tabAccess'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthScreen from './components/AuthScreen'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TicketsRoute from './pages/TicketsRoute'
import ContactPage from './pages/ContactPage'
import SettingsPage from './pages/SettingsPage'

/** Sends a tab this person isn't given (staff.tab_access) to their first allowed tab. */
function TabGuard({ tab, children }) {
  const { staff } = useAuth()
  const params = useParams()
  const key = tab ?? params.key
  if (canOpenTab(staff, key)) return children
  const next = firstAllowedPath(staff)
  if (!next) return <div className="error-banner">You don't have access to any Support tabs. Ask a JSS admin to turn them on in the hub (People page).</div>
  return <Navigate to={next} replace />
}

function StaffApp() {
  const { loading, user, staff, staffError } = useAuth()

  if (loading) return <div className="loading-state loading-fullpage">Loading…</div>
  if (!user) return <AuthScreen />
  if (staffError) return <div className="error-banner error-fullpage">{staffError}</div>
  if (!staff) return <div className="error-banner error-fullpage">No staff record is linked to this account. Contact management to get access.</div>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TabGuard tab="dashboard"><Dashboard /></TabGuard>} />
        <Route path="/tickets/:key" element={<TabGuard><TicketsRoute /></TabGuard>} />
        <Route path="/settings" element={<TabGuard tab="settings"><SettingsPage /></TabGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no staff auth. Everything else lives behind the AuthProvider gate. */}
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/*"
          element={
            <AuthProvider>
              <StaffApp />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
