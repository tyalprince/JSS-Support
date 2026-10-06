import { createClient } from '@supabase/supabase-js'
import { SUPABASE_DB_OPTIONS } from './supabaseSchema.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  ...SUPABASE_DB_OPTIONS,
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
