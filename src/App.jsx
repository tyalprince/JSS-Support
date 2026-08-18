import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthScreen from './components/AuthScreen'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TicketsRoute from './pages/TicketsRoute'

function Gate() {
  const { loading, user, staff, staffError } = useAuth()

  if (loading) return <div className="loading-state loading-fullpage">Loading…</div>
  if (!user) return <AuthScreen />
  if (staffError) return <div className="error-banner error-fullpage">{staffError}</div>
  if (!staff) return <div className="error-banner error-fullpage">No staff record is linked to this account. Contact management to get access.</div>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets/:key" element={<TicketsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
