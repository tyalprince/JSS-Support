const toE164 = (num) => '+' + String(num || '').replace(/[^\d]/g, '')

export async function sendSms({ to, body }) {
  const apiKey = (process.env.TELNYX_API_KEY || '').trim()
  if (!apiKey) throw new Error('TELNYX_API_KEY not configured')
  const fromNumber = toE164(process.env.TELNYX_PHONE_NUMBER)
  const toNumber = toE164(to)

  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromNumber, to: toNumber, text: body }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Telnyx error')
  return data
}
