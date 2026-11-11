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
