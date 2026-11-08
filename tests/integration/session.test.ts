import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSession } from '#perfeng/bff-session';

test('pairing consumes the code once and rejects mismatched CSRF', () => {
  const session = createSession();
  const grant = session.pair(session.code);
  assert.ok(grant);
  assert.equal(session.pair(session.code), undefined);
  assert.equal(session.logout(grant.id, 'incorrect'), false);
  assert.equal(session.read(grant.id)?.csrf, grant.csrf);
  assert.equal(session.logout(grant.id, grant.csrf), true);
  assert.equal(session.read(grant.id), undefined);
});

test('pairing expires and locks after five failures', () => {
  let now = 0;
  const expired = createSession(() => now);
  now += 300_000;
  assert.equal(expired.pair(expired.code), undefined);
  const locked = createSession(() => now);
  for (let i = 0; i < 5; i++) assert.equal(locked.pair('bad'), undefined);
  assert.equal(locked.pair(locked.code), undefined);
});

test('idle expiry slides but absolute expiry caps the session', () => {
  let now = 0;
  const idle = createSession(() => now);
  const first = idle.pair(idle.code)!;
  now = 900_000;
  assert.equal(idle.read(first.id), undefined);
  now = 0;
  const active = createSession(() => now);
  const grant = active.pair(active.code)!;
  for (now = 600_000; now < 28_800_000; now += 600_000) assert.ok(active.read(grant.id));
  assert.equal(active.read(grant.id), undefined);
});
