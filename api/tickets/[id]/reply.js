// POST /api/tickets/:id/reply
// Body: { body: string, ai_generated?: boolean }
// Inserts a staff reply into ticket_messages and, if the last inbound message on this ticket
// came in over email or SMS, dispatches the reply out over that same channel (Resend / Telnyx).
// Portal-only or internally-created tickets (no inbound email/sms on file) just get logged.
import { supabaseAdmin } from '../../_lib/supabaseAdmin.js'
import { requireStaff } from '../../_lib/requireStaff.js'
import { sendEmail } from '../../_lib/sendEmail.js'
import { sendSms } from '../../_lib/sendSms.js'
import { renderReplyHtml } from '../../_lib/emailTemplate.js'

// Only ever send from an address we actually control inbound routing for — never trust
// ticket.inbound_address blindly as a From header, even though it's our own worker's data.
const KNOWN_INBOUND_ADDRESSES = [
  'help@jumpstartsportspgh.com',
  'questions@jumpstartsportspgh.com',
  'support@jumpstartsportspgh.com',
  'info@jumpstartsportspgh.com',
]

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

  let outboundChannel = lastInbound?.channel === 'email' || lastInbound?.channel === 'sms'
    ? lastInbound.channel
    : null

  // No thread yet (first-ever reply): infer from whatever contact info the ticket itself
  // carries — the family/partner join, or reporter_email/phone for a contact-form/inbound-
  // email lead with no family_id at all.
  if (!outboundChannel && !lastInbound) {
    if (ticket.families?.primary_email || ticket.partners?.contact_email || ticket.reporter_email) outboundChannel = 'email'
    else if (ticket.families?.primary_phone || ticket.partners?.contact_phone || ticket.reporter_phone) outboundChannel = 'sms'
  }

  let sent = false
  let warning = null

  if (outboundChannel === 'email') {
    const to = ticket.families?.primary_email || ticket.partners?.contact_email || ticket.reporter_email
    if (to) {
      const fromAddress = KNOWN_INBOUND_ADDRESSES.includes(ticket.inbound_address) ? ticket.inbound_address : 'support@jumpstartsportspgh.com'
      try {
        await sendEmail({
          to,
          from: `Jump Start Sports <${fromAddress}>`,
          subject: ticket.subject || 'Re: your support ticket',
          html: renderReplyHtml(body),
        })
        sent = true
      } catch (e) { warning = `Message logged, but email send failed: ${e.message}` }
    } else {
      warning = 'Message logged, but no email address is on file for this ticket.'
    }
  } else if (outboundChannel === 'sms') {
    const to = ticket.families?.primary_phone || ticket.partners?.contact_phone || ticket.reporter_phone
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
