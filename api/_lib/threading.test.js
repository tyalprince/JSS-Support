// Run with:  node --test api/_lib/threading.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { threadKey, findThread } from './threading.js'

test('reply and forward prefixes, case and spacing are ignored', () => {
  assert.equal(threadKey('Re: Basketball'), 'basketball')
  assert.equal(threadKey('RE: Fwd: re:  Basketball '), 'basketball')
  assert.equal(threadKey('Re[2]: Cancellation / Refund?'), 'cancellation / refund?')
  assert.equal(threadKey('AW: Anmeldung'), 'anmeldung')
  assert.equal(threadKey('Regarding camp'), 'regarding camp') // "Re" only as a prefix
  assert.equal(threadKey(''), '')
})

test('a reply finds the newest ticket with the same subject', () => {
  const tickets = [
    { id: 'new', subject: 'Re: Basketball' },
    { id: 'old', subject: 'Basketball' },
    { id: 'other', subject: 'Camp question' },
  ]
  assert.equal(findThread(tickets, 'Re: Basketball').id, 'new')
  assert.equal(findThread(tickets, 'RE: RE: basketball').id, 'new')
  assert.equal(findThread(tickets, 'Totally new topic'), null)
  assert.equal(findThread(tickets, ''), null)
})
