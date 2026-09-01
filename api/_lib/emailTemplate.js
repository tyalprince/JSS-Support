function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Turns a plain-text reply (paragraphs separated by a blank line) into a full, branded HTML
// email document — header, body, footer (site link + the ticket's inbound_address as contact).
//
// This is a full <html>/<head>/<body> document, not a div fragment: Gmail's mobile app applies
// its own automatic dark-mode color inversion to HTML emails, which was repainting the navy
// header into a pale lavender and wiping out the near-white footer entirely. `color-scheme`/
// `supported-color-schemes` meta tags ask clients to render as authored, and the `[data-ogsc]`/
// `[data-ogsb]` selectors are Gmail's own hook for elements it has dark-mode-swapped — used here
// to force our real colors back rather than fighting Gmail's algorithm blind. bgcolor attributes
// are kept alongside inline background-color as a second line of defense for clients that only
// honor one or the other.
export function renderReplyHtml(bodyText, { fromAddress = 'support@jumpstartsportspgh.com' } = {}) {
  const paragraphs = String(bodyText || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;color:#334155 !important;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Jump Start Sports</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin: 0; padding: 0; background-color: #f4f6f9 !important; }
  [data-ogsc] .jss-header, [data-ogsb] .jss-header { background-color: #1e3a6e !important; }
  [data-ogsc] .jss-header-text, [data-ogsb] .jss-header-text { color: #ffffff !important; }
  [data-ogsc] .jss-body, [data-ogsb] .jss-body { background-color: #ffffff !important; }
  [data-ogsc] .jss-body p, [data-ogsb] .jss-body p { color: #334155 !important; }
  [data-ogsc] .jss-footer, [data-ogsb] .jss-footer { background-color: #f8fafc !important; }
  [data-ogsc] .jss-footer, [data-ogsc] .jss-footer div, [data-ogsb] .jss-footer, [data-ogsb] .jss-footer div { color: #94a3b8 !important; }
  [data-ogsc] .jss-footer-title, [data-ogsb] .jss-footer-title { color: #475569 !important; }
  [data-ogsc] .jss-link, [data-ogsb] .jss-link { color: #1e3a6e !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <tr>
            <td class="jss-header" bgcolor="#1e3a6e" style="background-color:#1e3a6e;padding:20px 28px;">
              <span class="jss-header-text" style="color:#ffffff !important;font-size:18px;font-weight:700;letter-spacing:0.02em;">Jump Start Sports</span>
            </td>
          </tr>
          <tr>
            <td class="jss-body" bgcolor="#ffffff" style="background-color:#ffffff;padding:28px;font-size:14px;line-height:1.6;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td class="jss-footer" bgcolor="#f8fafc" style="background-color:#f8fafc;padding:18px 28px;color:#94a3b8 !important;font-size:12px;line-height:1.6;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
              <div class="jss-footer-title" style="font-weight:600;color:#475569 !important;margin-bottom:4px;">Jump Start Sports</div>
              <div style="color:#94a3b8 !important;">Youth sports camps &amp; programs in Pittsburgh, PA</div>
              <div style="margin-top:10px;">
                <a class="jss-link" href="https://jumpstartsportspgh.com" style="color:#1e3a6e !important;text-decoration:none;">jumpstartsportspgh.com</a>
                <span style="color:#94a3b8 !important;">&nbsp;·&nbsp;</span>
                <a class="jss-link" href="mailto:${fromAddress}" style="color:#1e3a6e !important;text-decoration:none;">${fromAddress}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
