// Email Campaigns designer: blocks -> email-safe HTML (tables + inline styles,
// 600px wide). Shared by the browser preview and the server send, so what
// staff see is what families get. Every text value is escaped and every link
// must be http(s), mailto or tel.

export const BLOCK_TYPES = [
  { type: 'header', label: 'Header / Logo', icon: 'ti-layout-navbar' },
  { type: 'hero', label: 'Hero Banner', icon: 'ti-photo-star' },
  { type: 'heading', label: 'Heading', icon: 'ti-heading' },
  { type: 'paragraph', label: 'Paragraph', icon: 'ti-align-left' },
  { type: 'image', label: 'Image', icon: 'ti-photo' },
  { type: 'button', label: 'Button', icon: 'ti-click' },
  { type: 'programs', label: 'Program Card', icon: 'ti-calendar-event' },
  { type: 'camps', label: 'Camp Card', icon: 'ti-tent' },
  { type: 'divider', label: 'Divider', icon: 'ti-separator' },
  { type: 'footer', label: 'Footer', icon: 'ti-layout-bottombar' },
]

const NAVY = '#0f2044', RED = '#d6202f', INK = '#1f2937', MUTED = '#6b7280'
const FONT = 'Arial,Helvetica,sans-serif'

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** A safe href, or '' for anything that isn't http(s)/mailto/tel. */
export function safeUrl(u) {
  const s = String(u ?? '').trim()
  if (!s) return ''
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`
  return ''
}

const multiline = s => esc(s).replace(/\n/g, '<br>')

export function newBlock(type, ctx = {}) {
  const id = `b${Math.random().toString(36).slice(2, 9)}`
  switch (type) {
    case 'header': return { id, type, logo: ctx.logo || '', bg: NAVY }
    case 'hero': return { id, type, image: '', title: 'Registration Is Open!', text: 'Improve skills. Build confidence. Have fun!', buttonText: 'View Programs', url: ctx.regUrl || '' }
    case 'heading': return { id, type, text: 'Featured Programs', size: 22, align: 'left' }
    case 'paragraph': return { id, type, text: 'Hi {{first_name}},\n\nWrite your message here.', align: 'left' }
    case 'image': return { id, type, src: '', alt: '', url: '' }
    case 'button': return { id, type, text: 'Register Now', url: ctx.regUrl || '', color: RED }
    case 'programs': return { id, type, items: [] }
    case 'camps': return { id, type, items: [] }
    case 'divider': return { id, type }
    case 'footer': return { id, type, text: 'Questions? Just reply to this email and our team will help.' }
    default: return { id, type: 'paragraph', text: '' }
  }
}

/** The blocks a new campaign starts with. */
export function starterBlocks(ctx = {}) {
  return ['header', 'hero', 'paragraph', 'heading', 'programs', 'button', 'footer'].map(t => newBlock(t, ctx))
}

function button(text, url, color = RED, full = false) {
  const href = safeUrl(url)
  if (!text || !href) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${full ? 'width="100%"' : ''} style="margin:0 auto"><tr><td align="center" bgcolor="${esc(color)}" style="border-radius:8px;background:${esc(color)}">` +
    `<a href="${esc(href)}" style="display:block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${esc(text)}</a></td></tr></table>`
}

/** Program/camp card for one item: { name, image, ages, dates, schedule, price, url }. */
function card(it, label) {
  const img = safeUrl(it.image)
  const lines = [it.ages, it.dates, it.schedule].filter(Boolean).map(l => `<div style="font-size:12px;color:${MUTED};line-height:1.5">${esc(l)}</div>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#ffffff">` +
    (img ? `<tr><td><img src="${esc(img)}" alt="" width="100%" style="display:block;width:100%;height:auto;border:0"></td></tr>`
      : `<tr><td style="background:${NAVY};color:#ffffff;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:8px 12px">${esc(label)}</td></tr>`) +
    `<tr><td style="padding:12px;font-family:${FONT}"><div style="font-size:15px;font-weight:700;color:${NAVY};margin-bottom:4px">${esc(it.name || 'Program')}</div>${lines}` +
    (it.price ? `<div style="font-size:16px;font-weight:700;color:${INK};margin:8px 0 10px">${esc(it.price)}</div>` : '<div style="height:10px"></div>') +
    `${button('Register', it.url, RED, true)}</td></tr></table>`
}

function cards(items, label) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return ''
  const rows = []
  for (let i = 0; i < list.length; i += 2) {
    const pair = list.slice(i, i + 2)
    rows.push(`<tr>${pair.map(it => `<td class="col" width="50%" valign="top" style="padding:6px">${card(it, label)}</td>`).join('')}${pair.length === 1 ? '<td class="col" width="50%" style="padding:6px"></td>' : ''}</tr>`)
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`
}

/** One block's HTML row (inside the 600px container). */
export function renderBlock(b) {
  const pad = 'padding:10px 24px'
  switch (b?.type) {
    case 'header': {
      const logo = safeUrl(b.logo)
      return `<tr><td align="center" bgcolor="${esc(b.bg || NAVY)}" style="padding:18px 24px;background:${esc(b.bg || NAVY)}">${logo ? `<img src="${esc(logo)}" alt="Jump Start Sports" width="180" style="display:block;width:180px;max-width:60%;height:auto;border:0">` : `<span style="font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff">JUMP START SPORTS</span>`}</td></tr>`
    }
    case 'hero': {
      const img = safeUrl(b.image)
      return `<tr><td style="padding:0;background:${NAVY}">` +
        (img ? `<img src="${esc(img)}" alt="" width="600" style="display:block;width:100%;height:auto;border:0">` : '') +
        `<div style="padding:22px 24px 24px;font-family:${FONT}"><div style="font-size:26px;line-height:1.2;font-weight:800;color:#ffffff">${esc(b.title)}</div>` +
        (b.text ? `<div style="font-size:15px;color:#dbe4f7;margin:8px 0 16px">${multiline(b.text)}</div>` : '<div style="height:14px"></div>') +
        `<div style="text-align:left">${button(b.buttonText, b.url).replace('margin:0 auto', 'margin:0')}</div></div></td></tr>`
    }
    case 'heading':
      return `<tr><td style="${pad};font-family:${FONT};text-align:${b.align === 'center' ? 'center' : 'left'}"><div style="font-size:${Math.min(36, Math.max(16, Number(b.size) || 22))}px;line-height:1.25;font-weight:800;color:${NAVY}">${esc(b.text)}</div></td></tr>`
    case 'paragraph':
      return `<tr><td style="${pad};font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};text-align:${b.align === 'center' ? 'center' : 'left'}">${multiline(b.text)}</td></tr>`
    case 'image': {
      const src = safeUrl(b.src)
      if (!src) return ''
      const img = `<img src="${esc(src)}" alt="${esc(b.alt)}" width="552" style="display:block;width:100%;height:auto;border:0;border-radius:8px">`
      const href = safeUrl(b.url)
      return `<tr><td style="${pad}">${href ? `<a href="${esc(href)}">${img}</a>` : img}</td></tr>`
    }
    case 'button':
      return `<tr><td align="center" style="padding:14px 24px">${button(b.text, b.url, b.color || RED)}</td></tr>`
    case 'programs':
    case 'camps': {
      const html = cards(b.items, b.type === 'camps' ? 'Camp' : 'Program')
      return html ? `<tr><td style="padding:4px 18px">${html}</td></tr>` : ''
    }
    case 'divider':
      return `<tr><td style="padding:12px 24px"><div style="border-top:1px solid #e5e7eb;font-size:0;line-height:0">&nbsp;</div></td></tr>`
    case 'html': {
      // A saved template (staff-authored HTML): keep only what's inside <body>.
      const inner = String(b.html || '').replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '')
      return inner.trim() ? `<tr><td style="padding:0">${inner}</td></tr>` : ''
    }
    case 'footer':
      return `<tr><td style="padding:16px 24px;background:#f3f4f6;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};text-align:center">${multiline(b.text)}</td></tr>`
    default:
      return ''
  }
}

/** Whole email body. The send adds the unsubscribe/compliance footer after it. */
export function renderEmailHtml(blocks, { preheader = null } = {}) {
  const pre = preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>@media (max-width:620px){.wrap{width:100%!important}.col{display:block!important;width:100%!important}}</style></head>` +
    `<body style="margin:0;padding:0;background:#eef2f7">${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f7"><tr><td align="center" style="padding:16px 8px">` +
    `<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden">` +
    (blocks || []).map(renderBlock).join('') +
    `</table></td></tr></table></body></html>`
}

/** Card item from a programs row (+ registration site base URL). */
export function programItem(p, regBase = '') {
  const fmt = d => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
  const ages = p.age_min != null || p.age_max != null ? `Ages ${p.age_min ?? '?'}–${p.age_max ?? '?'}` : (p.age_group ? `Ages ${p.age_group}` : '')
  const dates = [fmt(p.start_date), fmt(p.end_date)].filter(Boolean).join(' – ')
  const schedule = [p.day_of_week, p.location || p.partner].filter(Boolean).join(' · ')
  const price = Number(p.tuition) > 0 ? `$${Number(p.tuition).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : ''
  return { programId: p.id, name: p.name, ages, dates, schedule, price, image: '', url: p.registration_link || regBase }
}
