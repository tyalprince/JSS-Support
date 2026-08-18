import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [staff, setStaff] = useState(null)
  const [staffError, setStaffError] = useState('')

  async function loadStaff(uid) {
    if (!uid) { setStaff(null); return }
    const { data, error } = await supabase.from('staff').select('*').eq('auth_user_id', uid).maybeSingle()
    if (error) { setStaffError(error.message); setStaff(null); return }
    setStaffError('')
    setStaff(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadStaff(session?.user?.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadStaff(session?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user || null,
    staff,
    staffError,
    isManagement: !!staff?.is_management,
    loading: session === undefined,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
