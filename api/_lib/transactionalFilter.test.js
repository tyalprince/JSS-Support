// Run with:  node --test api/_lib/transactionalFilter.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownTransactionalReason } from './transactionalFilter.js'

const skip = (email) => assert.ok(ownTransactionalReason(email), `expected skip: ${JSON.stringify(email)}`)
const keep = (email) => assert.equal(ownTransactionalReason(email), null, `expected ticket: ${JSON.stringify(email)}`)

test('Resend return-path senders on our domains are skipped, whatever the subject', () => {
  skip({ from: '010001a1ccb02215-d9b6-000000@rsend.jumpstartsportspittsburgh.com', subject: 'Trst' })
  skip({ from: '010001a170508efb-6935-000000@send.jumpstartsportspgh.com', subject: 'Jump Start: Program Canceled' })
  skip({ from: 'bounces@send.jumpstartsportspittsburgh.com', subject: '' })
})

test('automated mailboxes on either domain are skipped', () => {
  for (const local of ['registration', 'noreply', 'no-reply', 'portal', 'hello', 'newsletter', 'receipts', 'notifications']) {
    skip({ from: `${local}@jumpstartsportspittsburgh.com`, subject: 'hi' })
    skip({ from: `Jump Start Sports <${local}@jumpstartsportspgh.com>`, subject: 'hi' })
  }
  skip({ from: 'REGISTRATION@JumpStartSportsPittsburgh.com', subject: 'x' })
  skip({ from: 'noreply+tag@jumpstartsportspittsburgh.com', subject: 'x' })
})

test("Registration's transactional subjects are skipped from any sender", () => {
  skip({ from: 'someone@example.com', subject: "You're registered: Soccer Shots — Ava Smith" })
  skip({ from: 'someone@example.com', subject: 'You’re registered: 2 registrations — Jump Start Sports' })
  skip({ from: 'someone@example.com', subject: "You're on the waitlist: Soccer — Ava" })
  skip({ from: 'someone@example.com', subject: 'Registration Confirmed — Jump Start Sports' })
  skip({ from: 'someone@example.com', subject: 'Your Jump Start Sports Family Portal is Ready' })
  skip({ from: 'someone@example.com', subject: "[SANDBOX] You're registered: Soccer — Ava" })
})

test('real people still get tickets', () => {
  keep({ from: 'Parent <parent@gmail.com>', subject: 'Question about Saturday' })
  keep({ from: 'tprince@jumpstartsports.com', subject: 'Staff question' })
  keep({ from: 'coach@jumpstartsports.com', subject: "You're registered for the clinic?" })
  // A person (not an automated mailbox) on our own domain.
  keep({ from: 'tom@jumpstartsportspittsburgh.com', subject: 'Need help' })
  keep({ from: 'info@jumpstartsportspgh.com', subject: 'Forwarding this' })
  // Replies and forwards of our emails are parents talking to us.
  keep({ from: 'parent@gmail.com', subject: 'Re: Your Jump Start Sports Family Portal is Ready' })
  keep({ from: 'parent@gmail.com', subject: "Fwd: You're registered: Soccer — Ava" })
  keep({ from: 'parent@gmail.com', subject: 'Re: Registration Confirmed' })
  // Lookalike domains are not ours.
  keep({ from: 'registration@notjumpstartsportspgh.com', subject: 'x' })
  keep({ from: 'noreply@send.jumpstartsportspittsburgh.com.evil.example', subject: 'x' })
  keep({ from: 'noreply@example.com', subject: 'Your order shipped' })
})

test('Family Portal camp requests still become tickets, even from portal@ or a Resend bounce address', () => {
  keep({ from: 'Jump Start Sports Portal <portal@jumpstartsportspittsburgh.com>', subject: '[Family Portal] 🚗 Early pick-up – Ava Smith' })
  keep({ from: '010001a19f74d9b9-e6b4-000000@send.jumpstartsportspgh.com', subject: '[Family Portal] 🚗 Early pick-up – Ava Smith' })
  keep({ from: '010001a1ccb02215-d9b6-000000@rsend.jumpstartsportspittsburgh.com', subject: '[Family Portal] Late drop-off – Ava' })
  keep({ from: 'portal@jumpstartsportspittsburgh.com', subject: '[SANDBOX] [Family Portal] Early pick-up – Ava' })
  // Other portal@ mail is still filtered.
  skip({ from: 'portal@jumpstartsportspittsburgh.com', subject: 'Your account' })
})

test('missing or malformed input is not skipped', () => {
  keep({})
  keep({ from: null, subject: null })
  keep({ from: 'not-an-address', subject: 'hello' })
  assert.equal(ownTransactionalReason(), null)
})

// ---- Per-franchise domains --------------------------------------------------------------------
import { siteConfig } from './site.js'

test('a configured franchise recognises its own senders and still Pittsburgh\'s', () => {
  const own = siteConfig({ JSS_FRANCHISE: 'cleveland', JSS_SITE_DOMAIN: 'jumpstartsportscle.com' }).OWN_EMAIL_DOMAINS
  assert.ok(ownTransactionalReason({ from: 'registration@jumpstartsportscle.com', subject: 'x' }, own))
  assert.ok(ownTransactionalReason({ from: 'bounce-1@send.jumpstartsportscle.com', subject: 'x' }, own))
  assert.ok(ownTransactionalReason({ from: 'noreply@jumpstartsportspittsburgh.com', subject: 'x' }, own))
  assert.ok(ownTransactionalReason({ from: 'portal@jumpstartsportspgh.com', subject: 'x' }, own))
  assert.equal(ownTransactionalReason({ from: 'coach@jumpstartsportscle.com', subject: 'Need help' }, own), null)
  // a Pittsburgh deployment does not treat another franchise's domain as its own
  assert.equal(ownTransactionalReason({ from: 'registration@jumpstartsportscle.com', subject: 'x' }), null)
})
