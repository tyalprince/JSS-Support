import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="auth-shell">
      <form className="auth-form-panel" onSubmit={handleSubmit}>
        <div className="auth-form-inner">
          <h1 className="auth-title">JSS Support</h1>
          <div className="auth-sub">Staff sign in</div>
          {error && <div className="auth-err">{error}</div>}
          <label className="auth-label">Email</label>
          <input
            className="auth-input" type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <label className="auth-label">Password</label>
          <input
            className="auth-input" type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </div>
      </form>
    </div>
  )
}
