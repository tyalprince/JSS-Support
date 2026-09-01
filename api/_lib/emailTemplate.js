function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Turns a plain-text reply (paragraphs separated by a blank line) into a lightly branded HTML
// email — matches the header/footer style used elsewhere in this stack (e.g. the staff portal's
// hiring-invite emails), rather than a single unformatted <p> dump of the raw text.
export function renderReplyHtml(bodyText) {
  const paragraphs = String(bodyText || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1e3a6e;color:white;padding:18px 24px;border-radius:10px 10px 0 0">
        <h2 style="margin:0;font-size:16px">Jump Start Sports</h2>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;color:#334155;font-size:14px;line-height:1.5">
        ${paragraphs}
      </div>
    </div>`
}
