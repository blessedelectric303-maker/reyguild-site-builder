import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSubmissionLock, hasVerifiedMembership, inviteEmailMatches,
  inviteProblemMessage, readInviteLookup, safeNextPath, signInDestination,
} from '../lib/invite-flow.ts';

const denied = { code: '42501', message: 'permission denied for function invite_for_email' };

test('redirects keep normal same-site routes, query parameters and fragments', () => {
  for (const route of ['/', '/onboarding', '/join/abc', '/tm/enter?job=42#notes', '/a%20b']) {
    assert.equal(safeNextPath(route), route);
  }
});

test('redirects reject external, protocol-relative, backslash and control-character routes', () => {
  for (const route of [null, undefined, '', 'https://evil.test', '//evil.test', '///evil.test',
    '/\\evil.test', '/\\/evil.test', '/\t/evil.test', '/\n/evil.test', '/\r/evil.test',
    ' //evil.test', '/\u0000/evil.test', '/\u007f/evil.test', 'javascript:alert(1)']) {
    assert.equal(safeNextPath(route), '/', String(route));
  }
});

test('only a successful empty list resolves an email as uninvited', async () => {
  assert.deepEqual(await readInviteLookup(async () => ({ data: [], error: null })), { kind: 'none' });
  for (const data of [null, undefined, {}, '', [{}], [{ token: '' }], [{ token: ' ' }], [{ token: 7 }]]) {
    assert.equal((await readInviteLookup(async () => ({ data, error: null }))).kind, 'unavailable');
  }
});

test('permission errors override even plausible invite data', async () => {
  for (const data of [[], [{ token: 'real-token' }]]) {
    assert.deepEqual(await readInviteLookup(async () => ({ data, error: denied })), { kind: 'unavailable', error: denied });
  }
});

test('thrown and rejected lookups fail closed', async () => {
  const failure = new Error('network down');
  assert.deepEqual(await readInviteLookup(() => { throw failure; }), { kind: 'unavailable', error: failure });
  assert.deepEqual(await readInviteLookup(async () => { throw failure; }), { kind: 'unavailable', error: failure });
});

test('pending invites take precedence and their tokens cannot inject routes', async () => {
  const invite = await readInviteLookup(async () => ({ data: [{ token: 'abc/../xyz?next=//evil.test' }], error: null }));
  assert.equal(invite.kind, 'pending');
  assert.equal(signInDestination(invite, '/tm/enter', true), '/join/abc%2F..%2Fxyz%3Fnext%3D%2F%2Fevil.test');
});

test('paused lookup admits only verified existing members', () => {
  const unavailable = { kind: 'unavailable', error: denied };
  assert.equal(signInDestination(unavailable, '/tm/enter', false), null);
  assert.equal(signInDestination(unavailable, '/tm/enter', true), '/tm/enter');
  assert.equal(signInDestination(unavailable, '//evil.test', true), '/');
  assert.equal(signInDestination({ kind: 'none' }, '/onboarding', false), '/onboarding');
});

test('membership must succeed, name this signed-in user, and include a company', () => {
  const member = { user_id: 'user-1', company_id: 'company-1' };
  assert.equal(hasVerifiedMembership(member, null, 'user-1'), true);
  assert.equal(hasVerifiedMembership(member, denied, 'user-1'), false);
  for (const row of [null, undefined, {}, [], [member], { ...member, user_id: 'user-2' },
    { ...member, company_id: '' }, { ...member, company_id: ' ' }, { company_id: 'company-1' }]) {
    assert.equal(hasVerifiedMembership(row, null, 'user-1'), false);
  }
  assert.equal(hasVerifiedMembership(member, null, ''), false);
});

test('permission failures get friendly paused messaging; transport failures do not imply an invalid invite', () => {
  for (const operation of ['lookup', 'accept', 'preview']) {
    assert.match(inviteProblemMessage(denied, operation), /temporarily paused/);
    assert.match(inviteProblemMessage({ status: 403 }, operation), /temporarily paused/);
    assert.doesNotMatch(inviteProblemMessage(denied, operation), /42501|permission denied|function/);
    assert.doesNotMatch(inviteProblemMessage(new Error('network failed'), operation), /not valid|cancelled/);
  }
});

test('recipient verification normalizes email and fails closed on blank or missing values', () => {
  assert.equal(inviteEmailMatches(' Person@EXAMPLE.com ', 'person@example.com'), true);
  for (const [user, invite] of [[undefined, 'person@example.com'], ['', ''], [' ', ' '],
    ['person@example.com', null], ['owner@example.com', 'tech@example.com']]) {
    assert.equal(inviteEmailMatches(user, invite), false);
  }
});

test('submission lock suppresses rapid repeat calls and unlocks for retry', async () => {
  const lock = createSubmissionLock();
  let calls = 0;
  let resolve;
  const waiting = new Promise(done => { resolve = done; });
  async function submit() {
    if (!lock.tryAcquire()) return;
    try { calls += 1; await waiting; }
    finally { lock.release(); }
  }
  const first = submit();
  await submit();
  await submit();
  assert.equal(calls, 1);
  assert.equal(lock.isLocked(), true);
  resolve();
  await first;
  assert.equal(lock.isLocked(), false);
  await submit();
  assert.equal(calls, 2);
});

test('submission lock can recover after a thrown request', async () => {
  const lock = createSubmissionLock();
  assert.equal(lock.tryAcquire(), true);
  try { throw new Error('connection lost'); } catch {} finally { lock.release(); }
  assert.equal(lock.tryAcquire(), true);
});
