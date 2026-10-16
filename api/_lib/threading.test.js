// Run with:  node --test api/_lib/threading.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { threadKey, findThread, reopenPatch } from './threading.js'

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
})

test('any other email from a parent with a recent ticket goes to their latest one', () => {
  const tickets = [{ id: 'latest', subject: 'Camp question' }, { id: 'older', subject: 'Basketball' }]
  assert.equal(findThread(tickets, 'Totally new topic').id, 'latest')
  assert.equal(findThread(tickets, '').id, 'latest')
  assert.equal(findThread([], 'Re: Basketball'), null) // no recent ticket -> new ticket
})

test('reopening a resolved or closed ticket clears its resolution and counts the reopen', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  assert.deepEqual(reopenPatch({ status: 'resolved', reopened_count: 0 }, now), {
    status: 'open', reopened_at: '2026-10-16T12:00:00.000Z', reopened_count: 1, resolved_at: null, closed_at: null,
  })
  assert.equal(reopenPatch({ status: 'closed', reopened_count: 2 }, now).reopened_count, 3)
  assert.equal(reopenPatch({ status: 'open' }, now), null)
  assert.equal(reopenPatch({ status: 'in_progress' }, now), null)
})
