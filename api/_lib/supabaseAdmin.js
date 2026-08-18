import { createClient } from '@supabase/supabase-js'

// Service-role client for server-only use (Vercel functions). Never import from frontend code.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}
