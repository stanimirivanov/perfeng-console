import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeSnapshotVerifier } from '#perfeng/bff-snapshot-verifier';

const issuer = 'https://issuer.example/realms/perfeng';
const instant = 1_800_000_000_000;
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = { ...key.publicKey.export({ format: 'jwk' }), kid: 'reviewed-key', use: 'sig', alg: 'RS256' };
function token(profile: 'id' | 'initial-access', changes: object = {}) {
  const claims = { iss: issuer, sub: 'engineer', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate', azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', nonce: 'expected', iat: instant / 1000, exp: instant / 1000 + 300, ...changes };
  const text = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'reviewed-key' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
  return text + '.' + sign('RSA-SHA256', Buffer.from(text), key.privateKey).toString('base64url');
}
function input() {
  return { nonce: 'expected', requestStartedAtMs: instant, snapshot: { fetchedAtMs: instant, keys: [structuredClone(publicKey)] }, candidates: { stage: 'unverified-code' as const, idToken: token('id'), accessToken: token('initial-access'), expiresIn: 300 } };
}
const invalid = { ok: false, reason: 'invalid_pair' };
const unavailable = { ok: false, reason: 'unavailable' };

test('snapshot verification is lazy, owns caller inputs and exposes no credentials or authority', async () => {
  let observations = 0;
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const verifier = yield* makeSnapshotVerifier({ issuer, now: () => { observations++; return instant; } });
    const request = input();
    const pending = verifier.verify(request);
    assert.equal(observations, 0);
    request.nonce = 'changed'; request.snapshot.keys[0]!.n = 'AA'; request.candidates.accessToken = 'private-canary';
    assert.deepEqual(yield* pending, { ok: true, issuer, subject: 'engineer', validUntilMs: instant + 300000 });
  })));
});

test('signed at_hash is verified against exact access bytes when present, absence remains admissible', async () => {
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const verifier = yield* makeSnapshotVerifier({ issuer, now: () => instant });
    const request = input();
    const hash = createHash('sha256').update(request.candidates.accessToken, 'ascii').digest().subarray(0, 16).toString('base64url');
    request.candidates.idToken = token('id', { at_hash: hash });
    assert.equal((yield* verifier.verify(request)).ok, true);
    for (const at_hash of ['wrong', hash + '=', '', null, 5, ['bad']]) {
      request.candidates.idToken = token('id', { at_hash });
      assert.deepEqual(yield* verifier.verify(request), invalid);
    }
    request.candidates.idToken = token('id');
    assert.equal((yield* verifier.verify(request)).ok, true);
  })));
});

test('malformed context, trusted snapshots and signed substitutions refuse without partial identity', async () => {
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const verifier = yield* makeSnapshotVerifier({ issuer, now: () => instant });
    for (const changes of [{ sub: 'other' }, { aud: 'perfeng-control-plane' }, { nonce: 'wrong' }, { azp: 'wrong' }, { typ: 'Bearer' }]) {
      const request = input(); request.candidates.idToken = token('id', changes);
      assert.deepEqual(yield* verifier.verify(request), invalid);
    }
    for (const fetchedAtMs of [instant - 300001, instant + 1, -1, NaN]) {
      const request = input(); request.snapshot.fetchedAtMs = fetchedAtMs;
      assert.deepEqual(yield* verifier.verify(request), unavailable);
    }
    for (const malformed of [null, {}, { ...input(), nonce: '' }]) {
      assert.deepEqual(yield* verifier.verify(malformed as never), invalid);
    }
  })));
});

test('time is rechecked after foreign crypto; expiry, stale trust and clock rollback fail closed', async () => {
  for (const [after, expected] of [[instant + 300000, invalid], [instant + 300001, unavailable], [instant - 1, unavailable], [NaN, unavailable]] as const) {
    let reads = 0;
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const verifier = yield* makeSnapshotVerifier({ issuer, now: () => ++reads === 1 ? instant : after });
      assert.deepEqual(yield* verifier.verify(input()), expected);
    })));
  }
});

test('scope closure and caller cancellation fence outstanding crypto and escaped handles', async () => {
  const scope = Scope.makeUnsafe();
  const verifier = await Effect.runPromise(Scope.provide(makeSnapshotVerifier({ issuer, now: () => instant }), scope));
  const controller = new AbortController();
  const pending = Effect.runPromise(verifier.verify(input()), { signal: controller.signal });
  const rejected = assert.rejects(pending);
  controller.abort();
  await rejected;
  const closing = Effect.runPromise(verifier.verify(input()));
  const retired = assert.rejects(closing);
  await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
  await retired;
  await assert.rejects(Effect.runPromise(verifier.verify(input())));
});

test('active crypto operations are bounded without an unbounded wait queue', async () => {
  const scope = Scope.makeUnsafe();
  try {
    const verifier = await Effect.runPromise(Scope.provide(makeSnapshotVerifier({ issuer, now: () => instant }), scope));
    const running = Array.from({ length: 32 }, () => Effect.runPromise(verifier.verify(input())));
    assert.deepEqual(await Effect.runPromise(verifier.verify(input())), unavailable);
    assert.ok((await Promise.all(running)).every(result => result.ok));
  } finally {
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
  }
});

test('a pre-epoch retrieval cannot become a trusted snapshot near the epoch', async () => {
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const verifier = yield* makeSnapshotVerifier({ issuer, now: () => 0 });
    const request = input();
    request.requestStartedAtMs = 0;
    request.snapshot.fetchedAtMs = -1;
    assert.deepEqual(yield* verifier.verify(request), unavailable);
  })));
});


test('cancelled foreign crypto retains its admission slot until the native promise settles', { timeout: 10000 }, async t => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const original = globalThis.crypto.subtle.verify.bind(globalThis.crypto.subtle);
  let started = 0;
  t.mock.method(globalThis.crypto.subtle, 'verify', async (...args: Parameters<typeof original>) => {
    started++;
    await gate;
    return original(...args);
  });
  const scope = Scope.makeUnsafe();
  const controllers = Array.from({ length: 32 }, () => new AbortController());
  try {
    const verifier = await Effect.runPromise(Scope.provide(makeSnapshotVerifier({ issuer, now: () => instant }), scope));
    const running = controllers.map(controller => Effect.runPromiseExit(verifier.verify(input()), { signal: controller.signal }));
    const until = Date.now() + 2000;
    while (started < 32) {
      assert.ok(Date.now() < until, 'native verification did not start');
      await new Promise(resolve => setImmediate(resolve));
    }
    controllers.forEach(controller => controller.abort());
    assert.ok((await Promise.all(running)).every(Exit.isFailure));
    const result = await Effect.runPromise(verifier.verify(input()));
    assert.deepEqual(result, unavailable);
  } finally {
    release();
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
    t.mock.restoreAll();
  }
});

for (const inFlight of [false, true]) {
  test(`scope closure fences ${inFlight ? 'in-flight crypto' : 'escaped calls'} while later cleanup is delayed`, { timeout: 10000 }, async t => {
    const cleanup = Promise.withResolvers<void>();
    const cleanupStarted = Promise.withResolvers<void>();
    const crypto = Promise.withResolvers<void>();
    const cryptoStarted = Promise.withResolvers<void>();
    const native = globalThis.crypto.subtle.verify.bind(globalThis.crypto.subtle);
    let dispatches = 0;
    t.mock.method(globalThis.crypto.subtle, 'verify', async (...args: Parameters<typeof native>) => {
      dispatches++;
      cryptoStarted.resolve();
      await crypto.promise;
      return native(...args);
    });
    const scope = Scope.makeUnsafe();
    let closing: Promise<void> | undefined;
    try {
      const verifier = await Effect.runPromise(Scope.provide(makeSnapshotVerifier({ issuer, now: () => instant }), scope));
      await Effect.runPromise(Scope.provide(Effect.addFinalizer(() => Effect.promise(() => {
        cleanupStarted.resolve();
        return cleanup.promise;
      })), scope));
      const request = input();
      const pending = inFlight ? Effect.runPromiseExit(verifier.verify(request)) : undefined;
      if (inFlight) await cryptoStarted.promise;
      closing = Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
      await cleanupStarted.promise;
      crypto.resolve();
      const result = await (pending ?? Effect.runPromiseExit(verifier.verify(request)));
      assert.equal(result._tag, 'Failure');
      if (!inFlight) assert.equal(dispatches, 0);
    } finally {
      crypto.resolve();
      cleanup.resolve();
      await (closing ?? Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
      t.mock.restoreAll();
    }
  });
}


test('independent acquisitions of one snapshot factory retain separate clock history', async () => {
  let observed = instant + 1;
  const acquisition = makeSnapshotVerifier({ issuer, now: () => observed });
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const first = yield* acquisition;
    const second = yield* acquisition;
    assert.equal((yield* first.verify(input())).ok, true);
    observed = instant;
    assert.equal((yield* second.verify(input())).ok, true);
    assert.deepEqual(yield* first.verify(input()), { ok: false, reason: 'unavailable' });
  })));
});
