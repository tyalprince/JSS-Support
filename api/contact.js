// POST /api/contact
// Public "Contact Us" landing page submission — creates a prospect-channel support ticket.
// No auth (that's the point of a customer-facing form), so abuse controls live here instead
// of RLS: a honeypot field bots tend to fill, and a per-email rate limit against recent tickets.
import { supabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/sendEmail.js'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { name, email, phone, message, company } = req.body || {}

  // Honeypot: a real visitor never sees or fills this field. Report success so bots don't
  // learn to leave it blank, but skip the actual ticket insert.
  if (company) return res.status(200).json({ success: true })

  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' })
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required' })
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Message is required' })

  const admin = supabaseAdmin()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countErr } = await admin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'prospect')
    .ilike('body', `%${email}%`)
    .gte('created_at', oneHourAgo)
  if (!countErr && count >= 3) {
    return res.status(429).json({ error: 'Too many submissions from this email recently. Please wait a bit and try again.' })
  }

  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    '',
    message,
  ].filter(v => v !== null).join('\n')

  const { data: ticket, error: insertErr } = await admin
    .from('support_tickets')
    .insert({
      channel: 'prospect',
      subject: `Website contact form — ${name}`,
      body,
      reporter_email: email,
      reporter_phone: phone || null,
    })
    .select()
    .single()
  if (insertErr) return res.status(500).json({ error: 'Something went wrong on our end. Please try again.' })

  const notifyTo = process.env.SUPPORT_NOTIFY_EMAIL || 'info@jumpstartsportspgh.com'
  sendEmail({
    to: notifyTo,
    subject: `New website inquiry from ${name}`,
    html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
  }).catch(err => console.error('[contact] staff notify email failed', err))

  return res.status(200).json({ success: true, ticketId: ticket.id })
}
