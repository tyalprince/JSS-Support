// Run with:  node --test api/_lib/site.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jssEmail, replyFromAddress, DEFAULT_FROM, KNOWN_INBOUND_ADDRESSES } from './site.js'

test('jssEmail uses the new domain', () => {
  assert.equal(jssEmail('support'), 'support@jumpstartsportspittsburgh.com')
  assert.equal(DEFAULT_FROM, 'Jump Start Sports Support <support@jumpstartsportspittsburgh.com>')
})

test('replies go out from the address the ticket came in on, on either domain', () => {
  for (const local of ['help', 'questions', 'support', 'info']) {
    assert.equal(replyFromAddress(`${local}@jumpstartsportspgh.com`), `${local}@jumpstartsportspgh.com`)
    assert.equal(replyFromAddress(`${local}@jumpstartsportspittsburgh.com`), `${local}@jumpstartsportspittsburgh.com`)
  }
  assert.equal(KNOWN_INBOUND_ADDRESSES.length, 8)
})

test('unknown or missing inbound address falls back to support@ on the new domain', () => {
  assert.equal(replyFromAddress(null), 'support@jumpstartsportspittsburgh.com')
  assert.equal(replyFromAddress(undefined), 'support@jumpstartsportspittsburgh.com')
  assert.equal(replyFromAddress('ceo@evil.example'), 'support@jumpstartsportspittsburgh.com')
  assert.equal(replyFromAddress('applications@jumpstartsportspittsburgh.com'), 'support@jumpstartsportspittsburgh.com')
})

// ---- Per-franchise config (siteConfig) ------------------------------------------------------
import { siteConfig } from './site.js'
import { renderReplyHtml } from './emailTemplate.js'

test('with an empty env every value is exactly Pittsburgh\'s', () => {
  const s = siteConfig({})
  assert.equal(s.EMAIL_DOMAIN, 'jumpstartsportspittsburgh.com')
  assert.equal(s.SITE_ORIGIN, 'https://support.jumpstartsportspittsburgh.com')
  assert.equal(s.PUBLIC_WEBSITE_URL, 'https://www.jumpstartsportspittsburgh.com')
  assert.equal(s.PUBLIC_WEBSITE_LABEL, 'jumpstartsportspittsburgh.com')
  assert.equal(s.DEFAULT_FROM_ADDRESS, 'support@jumpstartsportspittsburgh.com')
  assert.equal(s.DEFAULT_FROM, 'Jump Start Sports Support <support@jumpstartsportspittsburgh.com>')
  assert.equal(s.DEFAULT_NOTIFY_EMAIL, 'info@jumpstartsportspittsburgh.com')
  assert.deepEqual(s.KNOWN_INBOUND_ADDRESSES, [
    'help@jumpstartsportspgh.com', 'questions@jumpstartsportspgh.com', 'support@jumpstartsportspgh.com', 'info@jumpstartsportspgh.com',
    'help@jumpstartsportspittsburgh.com', 'questions@jumpstartsportspittsburgh.com', 'support@jumpstartsportspittsburgh.com', 'info@jumpstartsportspittsburgh.com',
  ])
  assert.deepEqual(s.OWN_EMAIL_DOMAINS, ['jumpstartsportspittsburgh.com', 'jumpstartsportspgh.com'])
})

test('the Pittsburgh reply email renders the same links and logo as before', () => {
  const html = renderReplyHtml('Hi there')
  assert.ok(html.includes('src="https://support.jumpstartsportspittsburgh.com/brand/jss-logo-white.png"'))
  assert.ok(html.includes('href="https://www.jumpstartsportspittsburgh.com" style="color:#0f2044;text-decoration:none">jumpstartsportspittsburgh.com</a>'))
})

test('a configured franchise sends and links from its own domain', () => {
  const s = siteConfig({ JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com' })
  assert.equal(s.EMAIL_DOMAIN, 'jumpstartsportscle.com')
  assert.equal(s.jssEmail('info'), 'info@jumpstartsportscle.com')
  assert.equal(s.DEFAULT_FROM, 'Jump Start Sports Support <support@jumpstartsportscle.com>')
  assert.equal(s.DEFAULT_NOTIFY_EMAIL, 'info@jumpstartsportscle.com')
  assert.equal(s.SITE_ORIGIN, 'https://support.jumpstartsportscle.com')
  assert.equal(s.PUBLIC_WEBSITE_URL, 'https://www.jumpstartsportscle.com')
  assert.equal(s.PUBLIC_WEBSITE_LABEL, 'jumpstartsportscle.com')
  assert.deepEqual(s.KNOWN_INBOUND_ADDRESSES, ['help@jumpstartsportscle.com', 'questions@jumpstartsportscle.com', 'support@jumpstartsportscle.com', 'info@jumpstartsportscle.com'])
  assert.equal(replyFromAddress('help@jumpstartsportscle.com', s), 'help@jumpstartsportscle.com')
  assert.equal(replyFromAddress('help@jumpstartsportspittsburgh.com', s), 'support@jumpstartsportscle.com')
  assert.deepEqual(s.OWN_EMAIL_DOMAINS, ['jumpstartsportscle.com', 'jumpstartsportspittsburgh.com', 'jumpstartsportspgh.com'])
})

test('a sandbox deployment links to its own vercel.app host and mails from Pittsburgh', () => {
  const s = siteConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'jss-support-sandbox.vercel.app' })
  assert.equal(s.franchise.slug, 'sandbox')
  assert.equal(s.SITE_ORIGIN, 'https://jss-support-sandbox.vercel.app')
  assert.equal(s.DEFAULT_FROM_ADDRESS, 'support@jumpstartsportspittsburgh.com')
  assert.equal(s.PUBLIC_WEBSITE_URL, 'https://www.jumpstartsportspittsburgh.com')
  assert.equal(s.KNOWN_INBOUND_ADDRESSES.length, 8)
})

// ---- Franchise profile (city, brand, phone, socials) ----------------------------------------
import { PROFILE } from './site.js'
import { draftSystemPrompt } from '../tickets/[id]/draft.js'

const CLEVELAND = {
  JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com',
  JSS_CITY: 'Cleveland', JSS_STATE: 'OH', JSS_BRAND_NAME: 'Jump Start Sports Cleveland',
  JSS_PHONE: '216-555-0100', JSS_INSTAGRAM: 'jumpstartsportscle',
}

test('with an empty env the reply email and AI prompt keep Pittsburgh\'s exact text', () => {
  assert.equal(PROFILE.city, 'Pittsburgh')
  assert.equal(siteConfig({}).PROFILE.state, 'PA')
  const html = renderReplyHtml('Hi there')
  assert.ok(html.includes('<div>Youth sports camps &amp; programs in Pittsburgh, PA</div>'))
  assert.equal(renderReplyHtml('Hi there', { site: siteConfig({}) }), html)
  assert.ok(draftSystemPrompt().startsWith('You are drafting a support reply on behalf of Jump Start Sports (JSS) staff, a youth sports organization in Pittsburgh, PA.\n\nStyle rules:\n'))
  assert.equal(draftSystemPrompt(siteConfig({}).PROFILE), draftSystemPrompt())
})

test('a Cleveland profile shows up in the reply email and AI prompt, with no Pittsburgh left', () => {
  const s = siteConfig(CLEVELAND)
  assert.equal(s.PROFILE.brandName, 'Jump Start Sports Cleveland')
  assert.equal(s.PROFILE.phone, '216-555-0100')
  const html = renderReplyHtml('Hi there', { site: s })
  assert.ok(html.includes('Youth sports camps &amp; programs in Cleveland, OH</div>'))
  assert.ok(html.includes('href="mailto:support@jumpstartsportscle.com"'))
  const prompt = draftSystemPrompt(s.PROFILE)
  assert.ok(prompt.includes('a youth sports organization in Cleveland, OH.'))
  for (const out of [html, prompt]) {
    assert.ok(!/pittsburgh|412/i.test(out), out)
  }
})
