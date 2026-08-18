import { supabaseAdmin } from './supabaseAdmin.js'

// Validates the caller's Supabase access token (sent as `Authorization: Bearer <token>` from
// the signed-in browser session) and confirms an active staff record exists for that user.
// These routes send real emails/SMS and touch ticket data beyond what client-side RLS alone
// gates for insert/update, so every route here re-checks this instead of trusting the client.
// Returns { staff, user } or null — callers should respond 401 on null.
export async function requireStaff(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const admin = supabaseAdmin()
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return null

  const { data: staff, error: staffErr } = await admin
    .from('staff')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle()
  if (staffErr || !staff) return null

  return { staff, user: userData.user }
}
