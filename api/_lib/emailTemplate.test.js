import test from 'node:test'
import assert from 'node:assert/strict'
import { renderReplyHtml, renderContactNotifyHtml } from './emailTemplate.js'
import { siteConfig } from './site.js'

// Visible text (tags stripped, entities decoded, whitespace collapsed) and every href/src.
const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const visible = h => dec(h.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const links = h => [...h.matchAll(/(?:href|src)="([^"]*)"/g)].map(m => dec(m[1]))

function assertDesign(html, logo) {
  assert.ok(html.includes('background:#eef2f7'), 'grey page background')
  assert.ok(html.includes('bgcolor="#0f2044"'), 'navy header')
  assert.ok(html.includes(`<img src="${logo}" alt="Jump Start Sports"`), 'logo in header')
  assert.ok(html.includes('width="600"') && html.includes('border-radius:12px'), '600px rounded card')
}

const BODY = 'Hi Sarah,\n\nThanks for reaching out! Practice starts at 5:30 <sharp> & runs an hour.\nSee you "soon".\n\nCoach Mike'

test('reply email: new design, same words and links as before', () => {
  const html = renderReplyHtml(BODY, { site: siteConfig({}) })
  assertDesign(html, 'https://support.jumpstartsportspittsburgh.com/brand/jss-logo-white.png')
  assert.ok(html.includes('background:#f3f4f6'), 'grey footer')
  // Exactly the old visible text and links (captured from the pre-redesign template).
  assert.equal(visible(html), 'Hi Sarah, Thanks for reaching out! Practice starts at 5:30 <sharp> & runs an hour. See you "soon". Coach Mike Jump Start Sports Youth sports camps & programs in Pittsburgh, PA jumpstartsportspittsburgh.com · support@jumpstartsportspittsburgh.com')
  assert.deepEqual(links(html), [
    'https://support.jumpstartsportspittsburgh.com/brand/jss-logo-white.png',
    'https://www.jumpstartsportspittsburgh.com',
    'mailto:support@jumpstartsportspittsburgh.com',
  ])
})

test('reply email: staff body is escaped before it goes in the html block; paragraphs and line breaks kept', () => {
  const html = renderReplyHtml('<script>x</script> & <b>hi</b>\nline two\n\npara two', { site: siteConfig({}) })
  assert.ok(!html.includes('<script>') && !html.includes('<b>hi'))
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt; &amp; &lt;b&gt;hi&lt;/b&gt;<br/>line two</p><p style="margin:0 0 20px;">para two</p>'))
})

test('reply email: the ticket\'s from address and the franchise profile show in the footer', () => {
  const s = siteConfig({ JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com', JSS_CITY: 'Cleveland', JSS_STATE: 'OH' })
  const html = renderReplyHtml('Hi', { site: s, fromAddress: 'help@jumpstartsportscle.com' })
  assertDesign(html, 'https://support.jumpstartsportscle.com/brand/jss-logo-white.png')
  assert.ok(visible(html).endsWith('Jump Start Sports Youth sports camps & programs in Cleveland, OH jumpstartsportscle.com · help@jumpstartsportscle.com'))
  assert.ok(html.includes('href="mailto:help@jumpstartsportscle.com"'))
  assert.ok(!/pittsburgh/i.test(html))
})

test('contact-form staff notification: new design, same lines (now escaped)', () => {
  const body = ['Name: Jane <Doe>', 'Email: jane@example.com', 'Phone: 412-555-0100', '', 'I would like info on\nfall soccer & camps.'].join('\n')
  const html = renderContactNotifyHtml(body, { site: siteConfig({}) })
  assertDesign(html, 'https://support.jumpstartsportspittsburgh.com/brand/jss-logo-white.png')
  assert.equal(visible(html), 'Name: Jane <Doe> Email: jane@example.com Phone: 412-555-0100 I would like info on fall soccer & camps.')
  assert.ok(html.includes('Name: Jane &lt;Doe&gt;<br>Email: jane@example.com<br>Phone: 412-555-0100<br><br>I would like'))
})
