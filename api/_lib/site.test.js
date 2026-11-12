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
  assert.ok(html.includes('href="https://www.jumpstartsportspittsburgh.com" style="color:#1e3a6e !important;text-decoration:none;">jumpstartsportspittsburgh.com</a>'))
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
