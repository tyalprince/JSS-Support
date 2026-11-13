import { SITE } from './site.js'
import { renderEmailHtml } from '../../src/lib/emailBlocks.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Body text and footer styles from the Email Campaigns design (src/lib/emailBlocks.js), for
// content that goes in an `html` block because it keeps its own markup (paragraph breaks, links).
const FONT = 'Arial,Helvetica,sans-serif'
const BODY_STYLE = `padding:10px 24px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937`
const FOOTER_STYLE = `padding:16px 24px;background:#f3f4f6;font-family:${FONT};font-size:13px;line-height:1.6;color:#6b7280;text-align:center`
const LINK_STYLE = 'color:#0f2044;text-decoration:none'

/** The navy header block with this deployment's hosted white logo. */
export function headerBlock(site = SITE) {
  return { type: 'header', logo: `${site.SITE_ORIGIN}/brand/jss-logo-white.png` }
}

// Turns a plain-text reply (paragraphs separated by a blank line) into a full, branded HTML
// email in the Email Campaigns design — navy logo header, body, grey footer (site link + the
// ticket's inbound_address as contact). The staff-written body is escaped here before it goes
// into the `html` block, which does no escaping of its own.
// `site` defaults to this deployment's siteConfig(); tests pass another franchise's.
export function renderReplyHtml(bodyText, { site = SITE, fromAddress = site.DEFAULT_FROM_ADDRESS } = {}) {
  const { PUBLIC_WEBSITE_URL, PUBLIC_WEBSITE_LABEL, PROFILE } = site
  const paragraphs = String(bodyText || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 20px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  const footer = `<div style="${FOOTER_STYLE}">` +
    `<div style="font-weight:700;color:#374151;margin-bottom:4px;">Jump Start Sports</div>` +
    `<div>Youth sports camps &amp; programs in ${escapeHtml(PROFILE.city)}, ${escapeHtml(PROFILE.state)}</div>` +
    `<div style="margin-top:10px;">` +
    `<a href="${PUBLIC_WEBSITE_URL}" style="${LINK_STYLE}">${PUBLIC_WEBSITE_LABEL}</a>` +
    `<span>&nbsp;·&nbsp;</span>` +
    `<a href="mailto:${fromAddress}" style="${LINK_STYLE}">${fromAddress}</a>` +
    `</div></div>`

  return renderEmailHtml([
    headerBlock(site),
    { type: 'html', html: `<div style="${BODY_STYLE};padding-top:24px;padding-bottom:4px;">${paragraphs}</div>` },
    { type: 'html', html: footer },
  ])
}

// Staff notification for a public Contact Us submission (api/contact.js): the ticket body
// (Name / Email / Phone, blank line, message) with its line breaks kept.
export function renderContactNotifyHtml(body, { site = SITE } = {}) {
  return renderEmailHtml([
    headerBlock(site),
    { type: 'paragraph', text: String(body || '') },
  ])
}
