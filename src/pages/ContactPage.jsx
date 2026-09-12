import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', company: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setStatus('sent')
    } catch (e) {
      setError(e.message)
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="contact-shell">
        <div className="contact-card contact-success">
          <h1>Thanks for reaching out!</h1>
          <p>We&rsquo;ve received your message and someone from our team will get back to you soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="contact-shell">
      <form className="contact-card" onSubmit={handleSubmit}>
        <h1>Contact Jump Start Sports</h1>
        <p className="contact-sub">Questions about programs, camps, or getting started? Send us a message.</p>
        {error && <div className="auth-err">{error}</div>}

        <label className="auth-label">Name</label>
        <input className="auth-input" value={form.name} onChange={e => update('name', e.target.value)} required />

        <label className="auth-label">Email</label>
        <input className="auth-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} required />

        <label className="auth-label">Phone (optional)</label>
        <input className="auth-input" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />

        <label className="auth-label">How can we help?</label>
        <textarea
          className="auth-input contact-textarea"
          rows={5}
          value={form.message}
          onChange={e => update('message', e.target.value)}
          required
        />

        <input
          type="text"
          name="company"
          value={form.company}
          onChange={e => update('company', e.target.value)}
          className="contact-honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <button className="auth-btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send Message →'}
        </button>
      </form>
    </div>
  )
}
