// POST /api/tickets/:id/reply
// Body: { body: string, ai_generated?: boolean }
// Inserts a staff reply into ticket_messages and, if the last inbound message on this ticket
// came in over email or SMS, dispatches the reply out over that same channel (Resend / Telnyx).
// Portal-only or internally-created tickets (no inbound email/sms on file) just get logged.
import { supabaseAdmin } from '../../_lib/supabaseAdmin.js'
import { requireStaff } from '../../_lib/requireStaff.js'
import { sendEmail } from '../../_lib/sendEmail.js'
import { sendSms } from '../../_lib/sendSms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const auth = await requireStaff(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const ticketId = req.query.id
  const { body, ai_generated } = req.body || {}
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'body is required' })

  const admin = supabaseAdmin()

  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .select('*, families(primary_email, primary_phone), partners(contact_email, contact_phone)')
    .eq('id', ticketId)
    .maybeSingle()
  if (ticketErr) return res.status(500).json({ error: ticketErr.message })
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

  const { data: lastInbound, error: lastErr } = await admin
    .from('ticket_messages')
    .select('channel')
    .eq('ticket_id', ticketId)
    .not('sender_type', 'in', '(staff,system)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastErr) return res.status(500).json({ error: lastErr.message })

  const outboundChannel = lastInbound?.channel === 'email' || lastInbound?.channel === 'sms'
    ? lastInbound.channel
    : null

  let sent = false
  let warning = null

  if (outboundChannel === 'email') {
    const to = ticket.families?.primary_email || ticket.partners?.contact_email
    if (to) {
      try {
        await sendEmail({ to, subject: ticket.subject || 'Re: your support ticket', html: `<p>${escapeHtml(body)}</p>` })
        sent = true
      } catch (e) { warning = `Message logged, but email send failed: ${e.message}` }
    } else {
      warning = 'Message logged, but no email address is on file for this ticket.'
    }
  } else if (outboundChannel === 'sms') {
    const to = ticket.families?.primary_phone || ticket.partners?.contact_phone
    if (to) {
      try {
        await sendSms({ to, body })
        sent = true
      } catch (e) { warning = `Message logged, but SMS send failed: ${e.message}` }
    } else {
      warning = 'Message logged, but no phone number is on file for this ticket.'
    }
  }

  const { data: message, error: insertErr } = await admin
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'staff',
      sender_id: auth.staff.id,
      body,
      channel: sent ? outboundChannel : 'portal',
      ai_generated: !!ai_generated,
    })
    .select()
    .single()
  if (insertErr) return res.status(500).json({ error: insertErr.message })

  return res.status(200).json({ message, sent, warning })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}
