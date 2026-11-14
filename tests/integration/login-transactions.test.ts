import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createLoginTransactions } from '#perfeng/bff-login';

const runId = 'perf-20260902-120000-abcdef12';

test('login material is independent and the PKCE verifier stays behind a bound one-use handoff', () => {
  const store = createLoginTransactions();
  const begun = store.begin({ kind: 'run', runId });
  assert.ok(begun);
  assert.equal('codeVerifier' in begun, false);
  assert.equal('codeVerifier' in begun.authorization, false);
  assert.equal(begun.authorization.codeChallengeMethod, 'S256');
  assert.equal(store.consume(begun.authorization.state, 'wrong-browser'), undefined);
  assert.equal(store.consume('wrong-state', begun.browserBinding), undefined);
  const handoff = store.consume(begun.authorization.state, begun.browserBinding);
  assert.ok(handoff);
  for (const value of [begun.authorization.state, begun.authorization.nonce, begun.browserBinding, handoff.codeVerifier]) {
    assert.match(value, /^[A-Za-z0-9_-]{43}$/);
  }
  assert.equal(new Set([begun.authorization.state, begun.authorization.nonce, begun.browserBinding, handoff.codeVerifier]).size, 4);
  assert.equal(createHash('sha256').update(handoff.codeVerifier).digest('base64url'), begun.authorization.codeChallenge);
  assert.equal(handoff.nonce, begun.authorization.nonce);
  assert.deepEqual(handoff.returnIntent, { kind: 'run', runId });
  // Consumption precedes future exchange work: failure there cannot restore it.
  assert.equal(store.consume(begun.authorization.state, begun.browserBinding), undefined);
});

test('browser binding cannot be swapped between simultaneous transactions', () => {
  const store = createLoginTransactions();
  const one = store.begin({ kind: 'home' })!;
  const two = store.begin({ kind: 'run', runId })!;
  assert.notEqual(one.authorization.state, two.authorization.state);
  assert.notEqual(one.authorization.nonce, two.authorization.nonce);
  assert.equal(store.consume(one.authorization.state, two.browserBinding), undefined);
  assert.deepEqual(store.consume(one.authorization.state, one.browserBinding)?.returnIntent, { kind: 'home' });
  assert.ok(store.consume(two.authorization.state, two.browserBinding));
});

test('only closed home or pinned Run-ID intents are admitted and inputs are independently owned', () => {
  const store = createLoginTransactions();
  for (const value of [undefined, null, '/', '//evil.example', 'https://evil.example', [], {}, { kind: 'home', url: '//evil' },
    { kind: 'run', runId: '' }, { kind: 'run', runId: 'x'.repeat(101) }, { kind: 'run', runId, extra: true }]) {
    assert.equal(store.begin(value), undefined);
  }
  const input = { kind: 'run', runId };
  const begun = store.begin(input)!;
  input.runId = 'changed';
  begun.authorization.nonce = 'changed';
  const handoff = store.consume(begun.authorization.state, begun.browserBinding)!;
  assert.deepEqual(handoff.returnIntent, { kind: 'run', runId });
  assert.notEqual(handoff.nonce, 'changed');
  assert.equal(store.consume('é'.repeat(43), begun.browserBinding), undefined);
});

test('expiry equality refuses consumption and expired capacity is reclaimed without evicting live entries', () => {
  let now = 0;
  const store = createLoginTransactions(() => now);
  const first = store.begin({ kind: 'home' })!;
  now = 1;
  const rest = Array.from({ length: 127 }, () => store.begin({ kind: 'home' })!);
  assert.ok(rest.every(Boolean));
  assert.equal(store.begin({ kind: 'home' }), undefined);
  now = 300_000;
  assert.equal(store.consume(first.authorization.state, first.browserBinding), undefined);
  assert.ok(store.begin({ kind: 'home' }));
  assert.ok(store.consume(rest[0]!.authorization.state, rest[0]!.browserBinding));
  now = 300_001;
  assert.equal(store.consume(rest[1]!.authorization.state, rest[1]!.browserBinding), undefined);
});

test('stop clears pending transactions and clock failure cannot extend their authority', () => {
  for (const badClock of [-1, NaN, Infinity]) {
    let now = 0;
    const store = createLoginTransactions(() => now);
    const pending = store.begin({ kind: 'home' })!;
    now = badClock;
    assert.equal(store.consume(pending.authorization.state, pending.browserBinding), undefined);
    now = 0;
    assert.equal(store.begin({ kind: 'home' }), undefined);
  }
  const store = createLoginTransactions();
  const pending = store.begin({ kind: 'home' })!;
  store.stop();
  store.stop();
  assert.equal(store.consume(pending.authorization.state, pending.browserBinding), undefined);
  assert.equal(store.begin({ kind: 'home' }), undefined);
});

test('a failed clock drops all pending state without exposing backend diagnostics', () => {
  let failed = false;
  const store = createLoginTransactions(() => {
    if (failed) throw new Error('private-clock-diagnostic');
    return 0;
  });
  const pending = store.begin({ kind: 'home' })!;
  failed = true;
  assert.equal(store.consume(pending.authorization.state, pending.browserBinding), undefined);
  failed = false;
  assert.equal(store.begin({ kind: 'home' }), undefined);
});
