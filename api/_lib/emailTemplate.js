function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Turns a plain-text reply (paragraphs separated by a blank line) into a branded HTML email —
// header + footer matching the JSS-Support navy, with a professional footer (site link, contact
// address) instead of a single unformatted <p> dump of the raw text.
export function renderReplyHtml(bodyText, { fromAddress = 'support@jumpstartsportspgh.com' } = {}) {
  const paragraphs = String(bodyText || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#ffffff">
      <div style="background:#1e3a6e;padding:20px 28px;border-radius:10px 10px 0 0">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em">Jump Start Sports</span>
      </div>
      <div style="padding:28px;border:1px solid #e2e8f0;border-top:none;color:#334155;font-size:14px;line-height:1.6">
        ${paragraphs}
      </div>
      <div style="padding:18px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;background:#f8fafc;color:#94a3b8;font-size:12px;line-height:1.6">
        <div style="font-weight:600;color:#475569;margin-bottom:4px">Jump Start Sports</div>
        <div>Youth sports camps &amp; programs in Pittsburgh, PA</div>
        <div style="margin-top:10px">
          <a href="https://jumpstartsportspgh.com" style="color:#1e3a6e;text-decoration:none">jumpstartsportspgh.com</a>
          &nbsp;·&nbsp;
          <a href="mailto:${fromAddress}" style="color:#1e3a6e;text-decoration:none">${fromAddress}</a>
        </div>
      </div>
    </div>`
}
