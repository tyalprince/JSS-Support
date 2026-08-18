export async function sendEmail({ to, subject, html, from }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('RESEND_API_KEY not configured')
  const fromField = from || 'Jump Start Sports Support <support@jumpstartsportspgh.com>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromField, to: [to], subject: subject || 'Jump Start Sports Support', html }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Resend error')
  return data
}
