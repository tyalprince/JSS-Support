// POST /api/inbound/email
// Receives parsed inbound email from the Cloudflare Email Worker (jss-support-email-worker)
// handling help@/questions@/support@/info@jumpstartsportspgh.com, and creates a prospect-
// channel support ticket. Protected by a shared secret since this has no Supabase session to
// authenticate against — anyone with the URL but not the secret gets a 401.
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'

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
  const messageBody = (text && text.trim()) || stripHtml(html) || '(no message content)'
  const body = to ? `Received at: ${to}\n\n${messageBody}` : messageBody

  const admin = supabaseAdmin()
  const { data: ticket, error } = await admin
    .from('support_tickets')
    .insert({
      channel: 'prospect',
      subject: subject || `Email from ${senderName}`,
      body,
      reporter_email: senderEmail,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true, ticketId: ticket.id })
}
