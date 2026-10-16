// POST /api/tickets/:id/draft
// Pulls the ticket thread, up to 6 keyword-matched live chat_knowledge entries (scoped to
// this ticket's partner/program where set), and the ticket's
// family/participant/program context, then asks Claude for a short on-brand draft reply.
// The draft is returned to the UI for staff to review/edit — it is never sent automatically.
// Body: { instruction?, previousDraft? } — instruction alone guides a first draft (what the
// reply should say); with previousDraft it revises that draft.
import { supabaseAdmin } from '../../_lib/supabaseAdmin.js'
import { requireStaff } from '../../_lib/requireStaff.js'

const SYSTEM_PROMPT = `You are drafting a support reply on behalf of Jump Start Sports (JSS) staff, a youth sports organization in Pittsburgh, PA.

Style rules:
- Warm, professional, concise — a few short sentences, not a long essay.
- Directly answer or address what the sender asked, using only the context given.
- Do NOT invent facts, dates, prices, or policies that are not in the provided context.
- If the provided knowledge-base snippets or thread don't cover what's needed, write a helpful holding reply and say a team member will follow up with specifics, rather than guessing.
- Break the reply into short paragraphs (1-3 sentences each) with a blank line between them — never write it as one dense block of text. This becomes an actual formatted email, and each blank-line break becomes a real paragraph break there.
- No markdown, no preamble like "Here's a draft" — output ONLY the reply text itself, ready to send as-is.`

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'have', 'this', 'that',
  'from', 'was', 'were', 'will', 'can', 'has', 'had', 'about', 'into', 'their', 'them',
  'they', 'what', 'when', 'where', 'which', 'who', 'how', 'just', 'like', 'please',
])

function extractKeywords(text, max = 8) {
  const words = String(text || '').toLowerCase().match(/[a-z0-9]{4,}/g) || []
  const seen = new Set()
  const out = []
  for (const w of words) {
    if (STOP_WORDS.has(w) || seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= max) break
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const auth = await requireStaff(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const ticketId = req.query.id
  const { instruction, previousDraft } = req.body || {}
  const admin = supabaseAdmin()

  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .select('*, families(primary_parent_first, primary_parent_last), participants(first_name, last_name), programs(name, sport, season)')
    .eq('id', ticketId)
    .maybeSingle()
  if (ticketErr) return res.status(500).json({ error: ticketErr.message })
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

  const { data: thread, error: threadErr } = await admin
    .from('ticket_messages')
    .select('sender_type, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (threadErr) return res.status(500).json({ error: threadErr.message })

  // Live knowledge-base entries only (confirmed, inside their start/end window). Entries
  // scoped to a partner or program count only when they match this ticket's partner/program.
  const keywords = extractKeywords(`${ticket.subject || ''} ${ticket.body || ''}`)
  let knowledge = []
  if (keywords.length) {
    const { data } = await admin.rpc('chat_knowledge_current')
    knowledge = (data || [])
      .filter(k => (!k.partner_id || k.partner_id === ticket.partner_id) && (!k.program_id || k.program_id === ticket.program_id))
      .map(k => {
        const text = `${k.question} ${k.answer}`.toLowerCase()
        const hits = keywords.filter(w => text.includes(w)).length
        const scoped = (k.partner_id && k.partner_id === ticket.partner_id) || (k.program_id && k.program_id === ticket.program_id)
        return { ...k, score: hits + (scoped && hits ? 2 : 0) }
      })
      .filter(k => k.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }

  const contextLines = [
    `Channel: ${ticket.channel}`,
    `Subject: ${ticket.subject || '(none)'}`,
    ticket.families ? `Family: ${ticket.families.primary_parent_first} ${ticket.families.primary_parent_last}` : null,
    ticket.participants ? `Participant: ${ticket.participants.first_name} ${ticket.participants.last_name}` : null,
    ticket.programs ? `Program: ${ticket.programs.name} (${ticket.programs.sport || ''}, ${ticket.programs.season || ''})` : null,
    '',
    'Original message:',
    ticket.body,
  ].filter(v => v !== null).join('\n')

  const threadText = thread?.length
    ? thread.map(m => `[${m.sender_type}] ${m.body}`).join('\n')
    : '(no replies yet)'

  const knowledgeText = knowledge.length
    ? knowledge.map(k => {
        const scope = [k.program_type, k.sport, k.partner_name, k.location_name, k.program_name,
          k.ends_at ? `until ${String(k.ends_at).slice(0, 10)}` : null].filter(Boolean).join(' · ')
        return `${scope ? `(Applies to: ${scope})\n` : ''}Q: ${k.question}\nA: ${k.answer}`
      }).join('\n\n')
    : '(no matching knowledge-base entries)'

  const userMessage = previousDraft && instruction
    ? [
        'TICKET CONTEXT:', contextLines, '',
        'THREAD SO FAR:', threadText, '',
        'RELEVANT KNOWLEDGE BASE:', knowledgeText, '',
        'Here is a draft reply you already wrote for this ticket:', '', previousDraft, '',
        `Revise it per this instruction: ${instruction}`,
        'Keep it grounded in the same context above — do not invent new facts. Output ONLY the revised reply text, ready to send as-is.',
      ].join('\n')
    : [
        'TICKET CONTEXT:', contextLines, '',
        'THREAD SO FAR:', threadText, '',
        'RELEVANT KNOWLEDGE BASE:', knowledgeText, '',
        ...(instruction
          ? [
              'STAFF INSTRUCTIONS FOR THIS REPLY (from the JSS staff member sending it — follow them; facts stated here are confirmed and may be used):',
              String(instruction).slice(0, 2000), '',
            ]
          : []),
        'Write the draft reply now.',
      ].join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: err })
    }
    const data = await response.json()
    const draft = (data.content?.[0]?.text || '').trim()
    return res.status(200).json({ draft })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
