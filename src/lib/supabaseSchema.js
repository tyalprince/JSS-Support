// Postgres schema selection for browser code.
// VITE_SUPABASE_SCHEMA unset/blank -> 'public' (identical to the previous behavior).
// Server code uses api/_lib/supabaseSchema.js (SUPABASE_SCHEMA) instead.
export const SUPABASE_SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA || '').trim() || 'public'

/** Spread into createClient()'s options. */
export const SUPABASE_DB_OPTIONS = { db: { schema: SUPABASE_SCHEMA } }
