import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeDelegatedSnapshotVerifier } from '#perfeng/bff-delegated-snapshot';

const issuer = 'https://issuer.example/realms/perfeng';
const nowMs = 1800000000000;
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = { ...key.publicKey.export({ format: 'jwk' }), kid: 'reviewed', alg: 'RS256', use: 'sig' };
function input() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const text = encode({ alg: 'RS256', typ: 'JWT', kid: 'reviewed' }) + '.' + encode({ iss: issuer, sub: 'engineer', aud: 'perfeng-control-plane', azp: 'perfeng-console-delegate', typ: 'Bearer', iat: nowMs / 1000, exp: nowMs / 1000 + 300 });
  return { token: text + '.' + sign('RSA-SHA256', Buffer.from(text), key.privateKey).toString('base64url'), subject: 'engineer', requestStartedAtMs: nowMs, expiresIn: 120, snapshot: { fetchedAtMs: nowMs, keys: [structuredClone(publicKey)] } };
}

test('lazy delegated verifier captures context and publishes only bounded observation', async () => {
  let reads = 0;
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedSnapshotVerifier({ issuer, now: () => { reads++; return nowMs; } });
    const request = input();
    const pending = owner.verify(request);
    request.subject = 'substituted';
    request.snapshot.keys.length = 0;
    assert.equal(reads, 0);
    assert.deepEqual(yield* pending, { ok: true, issuer, subject: 'engineer', validUntilMs: nowMs + 120000 });
  })));
});

test('clock regression, post-crypto expiry and trust ageing refuse', async () => {
  for (const end of [nowMs - 1, nowMs + 120000, nowMs + 300001, NaN]) {
    let calls = 0;
    const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const owner = yield* makeDelegatedSnapshotVerifier({ issuer, now: () => calls++ === 0 ? nowMs : end });
      return yield* owner.verify(input());
    })));
    assert.equal(result.ok, false);
  }
});

test('closed scopes interrupt work before dispatch', async () => {
  const owner = await Effect.runPromise(Effect.scoped(makeDelegatedSnapshotVerifier({ issuer, now: () => nowMs })));
  assert.equal((await Effect.runPromiseExit(owner.verify(input())))._tag, 'Failure');
});

test('cancelled native crypto stays charged until settlement', { timeout: 10000 }, async t => {
  let release!: () => void;
  let started = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const native = globalThis.crypto.subtle.verify.bind(globalThis.crypto.subtle);
  t.mock.method(globalThis.crypto.subtle, 'verify', async (...args: Parameters<typeof native>) => { started++; await gate; return native(...args); });
  const scope = Scope.makeUnsafe();
  const controllers = Array.from({ length: 32 }, () => new AbortController());
  try {
    const owner = await Effect.runPromise(Scope.provide(makeDelegatedSnapshotVerifier({ issuer, now: () => nowMs }), scope));
    const running = controllers.map(controller => Effect.runPromiseExit(owner.verify(input()), { signal: controller.signal }));
    const end = Date.now() + 2000;
    while (started < 32) {
      assert.ok(Date.now() < end, 'native crypto did not start');
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.deepEqual(await Effect.runPromise(owner.verify(input())), { ok: false, reason: 'unavailable' });
    controllers.forEach(controller => controller.abort());
    assert.ok((await Promise.all(running)).every(Exit.isFailure));
    assert.deepEqual(await Effect.runPromise(owner.verify(input())), { ok: false, reason: 'unavailable' });
  } finally {
    controllers.forEach(controller => controller.abort());
    release();
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
    t.mock.restoreAll();
  }
});

test('three-second deadline refuses stalled crypto without returning identity', { timeout: 10000 }, async t => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const native = globalThis.crypto.subtle.verify.bind(globalThis.crypto.subtle);
  t.mock.method(globalThis.crypto.subtle, 'verify', async (...args: Parameters<typeof native>) => { await gate; return native(...args); });
  try {
    const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const owner = yield* makeDelegatedSnapshotVerifier({ issuer, now: () => nowMs });
      return yield* owner.verify(input());
    })));
    assert.deepEqual(result, { ok: false, reason: 'deadline' });
  } finally { release(); t.mock.restoreAll(); }
});

test('scope closure during native crypto refuses its late result', async t => {
  let release!: () => void;
  let observed!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { observed = resolve; });
  const native = globalThis.crypto.subtle.verify.bind(globalThis.crypto.subtle);
  t.mock.method(globalThis.crypto.subtle, 'verify', async (...args: Parameters<typeof native>) => { observed(); await gate; return native(...args); });
  const scope = Scope.makeUnsafe();
  try {
    const owner = await Effect.runPromise(Scope.provide(makeDelegatedSnapshotVerifier({ issuer, now: () => nowMs }), scope));
    const pending = Effect.runPromiseExit(owner.verify(input()));
    await started;
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
    release();
    assert.equal((await pending)._tag, 'Failure');
  } finally { release(); t.mock.restoreAll(); await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))); }
});


test('independent acquisitions of one snapshot factory retain separate clock history', async () => {
  let observed = nowMs + 1;
  const acquisition = makeDelegatedSnapshotVerifier({ issuer, now: () => observed });
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const first = yield* acquisition;
    const second = yield* acquisition;
    assert.equal((yield* first.verify(input())).ok, true);
    observed = nowMs;
    assert.equal((yield* second.verify(input())).ok, true);
    assert.deepEqual(yield* first.verify(input()), { ok: false, reason: 'unavailable' });
  })));
});
