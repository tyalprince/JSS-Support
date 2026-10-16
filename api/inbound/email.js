// POST /api/inbound/email
// Receives parsed inbound email from the Cloudflare Email Worker (jss-support-email-worker)
// handling help@/questions@/support@/info@jumpstartsportspgh.com, and creates a prospect-
// channel support ticket — or, when the sender already has a ticket from the last
// 90 days, adds it to that ticket's thread (the same-subject conversation if there
// is one, else their latest ticket) and reopens it. Protected by a shared secret since this has no Supabase session to
// authenticate against — anyone with the URL but not the secret gets a 401.
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findThread, reopenPatch } from '../_lib/threading.js'

// How far back a re-email finds the parent's ticket (matches the 90-day auto-close).
const THREAD_WINDOW_DAYS = 90

function extractEmail(raw) {
  if (!raw) return null
  const match = String(raw).match(/<([^>]+)>/)
  return (match ? match[1] : String(raw)).toLowerCase().trim()
}

function extractName(raw) {
  if (!raw) return ''
  const match = String(raw).match(/^"?([^"<]*?)"?\s*</)
  return match ? match[1].trim() : ''
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!process.env.SUPPORT_INBOUND_SECRET || token !== process.env.SUPPORT_INBOUND_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { from, to, subject, text, html } = req.body || {}
  const senderEmail = extractEmail(from)
  if (!senderEmail) return res.status(400).json({ error: 'Could not determine sender email' })

  const senderName = extractName(from) || senderEmail
  const inboundAddress = extractEmail(to)
  const messageBody = (text && text.trim()) || stripHtml(html) || '(no message content)'
  const body = inboundAddress ? `Received at: ${inboundAddress}\n\n${messageBody}` : messageBody

  const admin = supabaseAdmin()

  // Keyword blocker (Support > Settings): drop marketing / automated mail instead of
  // ticketing it. Answers 200 so the email worker doesn't retry. If the list can't be
  // read, fall through and create the ticket rather than lose a real email.
  const { data: blocked } = await admin.from('support_blocked_keywords').select('keyword, match_field')
  const subj = String(subject || '').toLowerCase()
  const hit = (blocked || []).find(b => {
    const kw = String(b.keyword || '').trim().toLowerCase()
    if (!kw) return false
    return b.match_field === 'sender' ? senderEmail.includes(kw) : subj.includes(kw)
  })
  if (hit) return res.status(200).json({ success: true, blocked: true, keyword: hit.keyword })

  // Any re-email continues the parent's ticket instead of starting a new one, so
  // staff see it on the ticket they answered — and a resolved/closed one reopens.
  const since = new Date(Date.now() - THREAD_WINDOW_DAYS * 86400000).toISOString()
  const { data: recent } = await admin
    .from('support_tickets')
    .select('id, subject, status, family_id, reopened_count')
    .eq('reporter_email', senderEmail)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(25)
  const thread = findThread(recent, subject)
  if (thread) {
    const { error: msgErr } = await admin.from('ticket_messages').insert({
      ticket_id: thread.id,
      sender_type: thread.family_id ? 'family' : 'prospect',
      channel: 'email',
      body,
    })
    if (msgErr) return res.status(500).json({ error: msgErr.message })
    const reopen = reopenPatch(thread)
    const { error: updErr } = await admin
      .from('support_tickets')
      .update(reopen || { updated_at: new Date().toISOString() })
      .eq('id', thread.id)
    if (updErr) return res.status(500).json({ error: updErr.message })
    return res.status(200).json({ success: true, ticketId: thread.id, threaded: true, reopened: !!reopen })
  }

  // New conversation: link it to the CRM family when exactly one family has this email.
  // Quoted for PostgREST; LIKE wildcards escaped so john_doe@ only matches itself.
  const quoted = `"${senderEmail.replace(/[\\%_]/g, c => `\\${c}`).replace(/"/g, '')}"`
  const { data: fams } = await admin
    .from('families')
    .select('id')
    .or(['primary_email', 'secondary_email', 'primary_email_2'].map(c => `${c}.ilike.${quoted}`).join(','))
    .limit(2)
  const familyId = fams && fams.length === 1 ? fams[0].id : null

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .insert({
      channel: 'prospect',
      subject: subject || `Email from ${senderName}`,
      body,
      reporter_email: senderEmail,
      inbound_address: inboundAddress,
      family_id: familyId,
    })
    .select()
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  // The database also enforces the blocklist (support_tickets_block_keywords trigger skips
  // the insert), so no row back means it was blocked there.
  if (!ticket) return res.status(200).json({ success: true, blocked: true })

  return res.status(200).json({ success: true, ticketId: ticket.id })
}
