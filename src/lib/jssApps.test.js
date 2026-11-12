// Run with:  node --test src/lib/jssApps.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jssAppLinks, jssAppUrl, franchiseFromHost } from './jssApps.js'

const byKey = (l) => Object.fromEntries(l.map((x) => [x.key, x.url]))

test('Pittsburgh links to its own domain from a custom subdomain', () => {
  assert.equal(franchiseFromHost('crm.jumpstartsportspittsburgh.com'), 'pittsburgh')
  const l = byKey(jssAppLinks('crm', 'crm.jumpstartsportspittsburgh.com'))
  assert.equal(l.crm, undefined)
  assert.equal(l.staff_portal, 'https://staff.jumpstartsportspittsburgh.com')
  assert.equal(l.family_portal, 'https://portal.jumpstartsportspittsburgh.com')
  assert.equal(l.registration, 'https://register.jumpstartsportspittsburgh.com')
  assert.equal(l.vendor_portal, 'https://vendors.jumpstartsportspittsburgh.com')
  assert.equal(l.accounting, 'https://accounting.jumpstartsportspittsburgh.com')
  assert.equal(l.support, 'https://support.jumpstartsportspittsburgh.com')
  assert.equal(l.hiring, 'https://jobs.jumpstartsportspittsburgh.com')
  assert.equal(l.hub, 'https://jss-hub.vercel.app')
})
test('old Pittsburgh vercel.app hosts also link to the new domain', () => {
  assert.equal(franchiseFromHost('jss-crm-pittsburgh.vercel.app'), 'pittsburgh')
  assert.equal(franchiseFromHost('jss-sponsors-pittsburgh.vercel.app'), 'pittsburgh')
  const l = byKey(jssAppLinks('crm', 'jss-crm-pittsburgh.vercel.app'))
  assert.equal(l.staff_portal, 'https://staff.jumpstartsportspittsburgh.com')
  assert.equal(jssAppUrl('sponsors'), 'https://sponsors.jumpstartsportspittsburgh.com')
})
test('keeps sandbox deployments pointing at sandbox siblings', () => {
  assert.equal(franchiseFromHost('jss-family-portal-sandbox.vercel.app'), 'sandbox')
  assert.equal(byKey(jssAppLinks('support', 'jss-support-sandbox.vercel.app')).crm, 'https://jss-crm-sandbox.vercel.app')
  assert.equal(jssAppUrl('sponsors', 'sandbox'), 'https://jss-sponsors-sandbox.vercel.app')
})
test('falls back to Pittsburgh for previews and localhost', () => {
  assert.equal(franchiseFromHost('jss-crm-pittsburgh-git-x-tyal-prince-s-projects.vercel.app'), 'pittsburgh')
  assert.equal(franchiseFromHost('localhost'), 'pittsburgh')
  assert.equal(franchiseFromHost('notjumpstartsportspittsburgh.com'), 'pittsburgh')
  assert.equal(jssAppUrl('nope'), null)
})
test('applies https-only overrides and ignores bad JSON', () => {
  const l = byKey(jssAppLinks('crm', 'x', '{"accounting":"https://books.example.com/","vendor_portal":"javascript:alert(1)"}'))
  assert.equal(l.accounting, 'https://books.example.com')
  assert.equal(l.vendor_portal, 'https://vendors.jumpstartsportspittsburgh.com')
  assert.equal(byKey(jssAppLinks('crm', 'x', 'nope')).accounting, 'https://accounting.jumpstartsportspittsburgh.com')
})

// ---- Per-franchise settings (franchiseConfig) -----------------------------------------------
import { franchiseConfig } from './jssApps.js'

test('with nothing set, a deployment is Pittsburgh exactly as before', () => {
  const c = franchiseConfig({})
  assert.deepEqual([c.slug, c.siteDomain, c.emailDomain], ['pittsburgh', 'jumpstartsportspittsburgh.com', 'jumpstartsportspittsburgh.com'])
  assert.equal(franchiseConfig(undefined, 'crm.jumpstartsportspittsburgh.com').slug, 'pittsburgh')
  assert.equal(franchiseConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'crm.jumpstartsportspittsburgh.com' }).slug, 'pittsburgh')
})
test('a vercel.app franchise is found from its host, and mails from Pittsburgh until told otherwise', () => {
  const c = franchiseConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'jss-crm-sandbox.vercel.app' })
  assert.deepEqual([c.slug, c.siteDomain, c.emailDomain], ['sandbox', null, 'jumpstartsportspittsburgh.com'])
  assert.equal(franchiseConfig({}, 'jss-support-sandbox.vercel.app').slug, 'sandbox')
})
test('env settings win, with or without a framework prefix', () => {
  const c = franchiseConfig({ VITE_JSS_FRANCHISE: 'Cleveland', NEXT_PUBLIC_JSS_SITE_DOMAIN: 'JumpStartSportsCLE.com ', JSS_EMAIL_DOMAIN: 'mail.jumpstartsportscle.com' }, 'crm.jumpstartsportspittsburgh.com')
  assert.deepEqual([c.slug, c.siteDomain, c.emailDomain], ['cleveland', 'jumpstartsportscle.com', 'mail.jumpstartsportscle.com'])
  assert.equal(c.domains.cleveland, 'jumpstartsportscle.com')
  assert.equal(c.domains.pittsburgh, 'jumpstartsportspittsburgh.com')
  assert.equal(franchiseConfig({ JSS_FRANCHISE: 'sandbox', JSS_EMAIL_DOMAIN: 'sandbox.example.org' }).emailDomain, 'sandbox.example.org')
})
test('the email domain defaults to the site domain; junk values are ignored', () => {
  assert.equal(franchiseConfig({ JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com' }).emailDomain, 'jumpstartsportscle.com')
  const bad = franchiseConfig({ JSS_FRANCHISE: 'evil/../x', JSS_SITE_DOMAIN: 'not a domain', JSS_EMAIL_DOMAIN: 'x@y' })
  assert.deepEqual([bad.slug, bad.siteDomain, bad.emailDomain], ['pittsburgh', 'jumpstartsportspittsburgh.com', 'jumpstartsportspittsburgh.com'])
})
test('links follow the configured franchise domain', () => {
  const cfg = franchiseConfig({ JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com' })
  const l = byKey(jssAppLinks('crm', 'crm.jumpstartsportscle.com', null, cfg))
  assert.equal(l.staff_portal, 'https://staff.jumpstartsportscle.com')
  assert.equal(byKey(jssAppLinks('crm', 'localhost', null, cfg)).support, 'https://support.jumpstartsportscle.com')
  // Pittsburgh's own hosts still resolve to Pittsburgh from any deployment
  assert.equal(byKey(jssAppLinks('crm', 'crm.jumpstartsportspittsburgh.com', null, cfg)).support, 'https://support.jumpstartsportspittsburgh.com')
  // a domain-less franchise links to its vercel.app siblings even from previews
  const sb = franchiseConfig({ JSS_FRANCHISE: 'sandbox' })
  assert.equal(byKey(jssAppLinks('crm', 'jss-crm-sandbox-git-x-tyal-prince-s-projects.vercel.app', null, sb)).support, 'https://jss-support-sandbox.vercel.app')
})

// ---- Franchise profile (city, brand, phone, socials) -----------------------------------------
import { franchiseProfile, FRANCHISE_PROFILES } from './jssApps.js'

test('with nothing set the profile is Pittsburgh, and franchiseConfig carries it', () => {
  assert.deepEqual(franchiseProfile({}), FRANCHISE_PROFILES.pittsburgh)
  assert.deepEqual(franchiseConfig({}).profile, FRANCHISE_PROFILES.pittsburgh)
  assert.equal(franchiseProfile(undefined).phone, '412-265-8267')
})
test('profile settings win, with or without a prefix, keeping their case', () => {
  const p = franchiseProfile({
    JSS_CITY: 'Cleveland', VITE_JSS_STATE: 'oh', NEXT_PUBLIC_JSS_BRAND_NAME: 'Jump Start Sports Cleveland',
    JSS_SHORT_NAME: 'JSSC', JSS_PHONE: '216-555-0100', JSS_TIMEZONE: 'America/New_York',
    JSS_INSTAGRAM: '@jumpstartsportscle', JSS_CAMP_BOOKING_URL: 'https://jumpstartsportscle.jumbula.com/',
  })
  assert.deepEqual(p, {
    city: 'Cleveland', state: 'OH', brandName: 'Jump Start Sports Cleveland', shortName: 'JSSC',
    phone: '216-555-0100', timeZone: 'America/New_York', instagram: 'jumpstartsportscle',
    facebookName: 'Jump Start Sports Cleveland', campBookingUrl: 'https://jumpstartsportscle.jumbula.com/',
  })
})
test('markup and junk never reach a page: invalid values fall back to Pittsburgh', () => {
  const p = franchiseProfile({
    JSS_CITY: '<script>alert(1)</script>', JSS_BRAND_NAME: 'x'.repeat(81), JSS_STATE: 'Ohio',
    JSS_PHONE: 'call us', JSS_TIMEZONE: 'Mars', JSS_INSTAGRAM: 'bad handle!', JSS_FACEBOOK_NAME: 'a"b',
    JSS_CAMP_BOOKING_URL: 'javascript:alert(1)', JSS_SHORT_NAME: 'J S S',
  })
  assert.deepEqual(p, FRANCHISE_PROFILES.pittsburgh)
})
