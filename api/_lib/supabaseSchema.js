// Postgres schema selection for server code (serverless api/** and shared helpers).
// SUPABASE_SCHEMA unset/blank -> 'public' (identical to the previous behavior).

export function resolveSchema(env = process.env) {
  return String(env.SUPABASE_SCHEMA || '').trim() || 'public'
}

export const SUPABASE_SCHEMA = resolveSchema()

/** Options to spread into createClient(url, key, { ...opts, ...SUPABASE_DB_OPTIONS }). */
export const SUPABASE_DB_OPTIONS = { db: { schema: SUPABASE_SCHEMA } }

/**
 * Headers for raw fetch() calls to /rest/v1/ (GET/HEAD use Accept-Profile,
 * writes and RPC use Content-Profile). Empty object for 'public' so default
 * requests are byte-for-byte unchanged.
 */
export function schemaHeaders(schema = SUPABASE_SCHEMA) {
  return schema === 'public' ? {} : { 'Accept-Profile': schema, 'Content-Profile': schema }
}
export const SCHEMA_HEADERS = schemaHeaders()
