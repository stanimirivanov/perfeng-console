import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeSigningKeyCache } from './signing-key-cache.ts';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'signing-key-cache-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const publicKey = { ...generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' }), kid: 'old', use: 'sig', alg: 'RS256' };
  const state = { now: 1_800_000_000_000, hits: 0, closed: 0, kid: 'old', mode: 'normal', throwClock: false };
  const pending = new Set<ServerResponse>();
  const body = () => JSON.stringify({ keys: [{ ...publicKey, kid: state.kid }] });
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (req, res) => {
    state.hits++; assert.equal(req.method, 'GET'); assert.equal(req.url, '/realms/perfeng/protocol/openid-connect/certs');
    res.once('close', () => { state.closed++; pending.delete(res); });
    res.setHeader('Content-Type', 'application/json');
    if (state.mode === 'stall') { pending.add(res); res.write(''); }
    else if (state.mode === 'outage') { res.writeHead(503); res.end('private-provider-body'); }
    else res.end(body());
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const config = { issuer: 'https://127.0.0.1:' + address.port + '/realms/perfeng', ca: readFileSync(cert, 'utf8'), deadlineMs: 3000, now: () => { if (state.throwClock) throw new Error('private-clock'); return state.now; } };
  async function until(predicate: () => boolean) {
    const deadline = Date.now() + 2000;
    while (!predicate()) { if (Date.now() >= deadline) assert.fail('fixture did not reach expected boundary'); await new Promise(resolve => setTimeout(resolve, 5)); }
  }
  return { state, config, until, release: (text = body()) => { for (const response of pending) response.end(text); } };
}

async function scopedCache(t: TestContext, config: Parameters<typeof makeSigningKeyCache>[0]) {
  const scope = Scope.makeUnsafe();
  t.after(() => Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
  return { scope, cache: await Effect.runPromise(Scope.provide(makeSigningKeyCache(config), scope)) };
}

test('snapshot cache reuses original freshness, rotates after expiry and never serves stale outage data', { timeout: 10000 }, async t => {
  const f = await fixture(t); const { cache } = await scopedCache(t, f.config);
  const first = await Effect.runPromise(cache.readSnapshot()); assert.ok(first.ok); assert.equal(f.state.hits, 1);
  f.state.now += 300000;
  assert.strictEqual(await Effect.runPromise(cache.readSnapshot()), first); assert.equal(f.state.hits, 1);
  f.state.now++; f.state.kid = 'rotated';
  const rotated = await Effect.runPromise(cache.readSnapshot()); assert.ok(rotated.ok); assert.equal(rotated.snapshot.keys[0]?.kid, 'rotated'); assert.equal(f.state.hits, 2);
  assert.equal(rotated.snapshot.fetchedAtMs, f.state.now); assert.ok(Object.isFrozen(rotated.snapshot));
  f.state.now += 300001; f.state.mode = 'outage';
  assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'unavailable' });
  assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'unavailable' }); assert.equal(f.state.hits, 4);
  f.state.mode = 'normal'; assert.ok((await Effect.runPromise(cache.readSnapshot())).ok); assert.equal(f.state.hits, 5);
});

test('invalid and rollback clocks invalidate cached authority without networking', { timeout: 10000 }, async t => {
  const f = await fixture(t); const { cache } = await scopedCache(t, f.config);
  assert.ok((await Effect.runPromise(cache.readSnapshot())).ok);
  f.state.now += 1000; assert.ok((await Effect.runPromise(cache.readSnapshot())).ok);
  f.state.now--; assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'invalid_clock' }); assert.equal(f.state.hits, 1);
  f.state.now++; assert.ok((await Effect.runPromise(cache.readSnapshot())).ok); assert.equal(f.state.hits, 2);
  for (const invalid of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER, 1.5]) {
    f.state.now = invalid; assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'invalid_clock' }); assert.equal(f.state.hits, 2);
  }
  f.state.throwClock = true; assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'invalid_clock' });
});

test('32 concurrent readers share one wire request; cancelling one does not revoke the others', { timeout: 10000 }, async t => {
  const f = await fixture(t); f.state.mode = 'stall'; const { cache } = await scopedCache(t, f.config);
  const controllers = Array.from({ length: 32 }, () => new AbortController());
  const readers = controllers.map(controller => Effect.runPromise(cache.readSnapshot(), { signal: controller.signal }));
  await f.until(() => f.state.hits === 1);
  assert.deepEqual(await Effect.runPromise(cache.readSnapshot()), { ok: false, reason: 'unavailable' }); assert.equal(f.state.hits, 1);
  const cancelled = assert.rejects(readers[0]!); controllers[0]!.abort(); await cancelled;
  assert.equal(f.state.closed, 0); f.release();
  const results = await Promise.all(readers.slice(1)); assert.ok(results.every(result => result.ok)); assert.ok(results.every(result => result === results[0])); assert.equal(f.state.hits, 1);
});

test('last-reader and owner cancellation close the wire and escaped handles cannot publish or fetch', { timeout: 10000 }, async t => {
  const f = await fixture(t); f.state.mode = 'stall'; const { cache, scope } = await scopedCache(t, f.config);
  const controller = new AbortController(); const abandoned = Effect.runPromise(cache.readSnapshot(), { signal: controller.signal });
  await f.until(() => f.state.hits === 1); const cancelled = assert.rejects(abandoned); controller.abort();
  await Promise.race([cancelled, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('last-reader cancellation waited for transport deadline')), 1000); timer.unref(); })]);
  await f.until(() => f.state.closed === 1);
  const active = Effect.runPromise(cache.readSnapshot()); const closedRead = assert.rejects(active);
  await f.until(() => f.state.hits === 2);
  await Promise.race([Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('owner shutdown waited for transport deadline')), 1000); timer.unref(); })]);
  await Promise.race([closedRead, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('owner left reader pending until deadline')), 1000); timer.unref(); })]);
  await f.until(() => f.state.closed === 2);
  f.release(); await assert.rejects(Effect.runPromise(cache.readSnapshot())); assert.equal(f.state.hits, 2);
});

test('each acquisition owns its clock history and captures configuration before awaits', { timeout: 10000 }, async t => {
  const f = await fixture(t); const acquire = makeSigningKeyCache(f.config);
  f.config.issuer = 'https://never-fetch.invalid/realms/attacker'; f.config.ca = ''; f.config.now = () => NaN;
  const scopes = [Scope.makeUnsafe(), Scope.makeUnsafe()];
  t.after(async () => { for (const scope of scopes) await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))); });
  const first = await Effect.runPromise(Scope.provide(acquire, scopes[0]!));
  assert.ok((await Effect.runPromise(first.readSnapshot())).ok);
  f.state.now -= 1000;
  const second = await Effect.runPromise(Scope.provide(acquire, scopes[1]!));
  assert.ok((await Effect.runPromise(second.readSnapshot())).ok); assert.equal(f.state.hits, 2);
  assert.deepEqual(await Effect.runPromise(first.readSnapshot()), { ok: false, reason: 'invalid_clock' });
});

test('clock jumps while readers await the wire cannot publish an over-age snapshot', { timeout: 10000 }, async t => {
  const f = await fixture(t); f.state.mode = 'stall'; const { cache } = await scopedCache(t, f.config);
  const result = Effect.runPromise(cache.readSnapshot()); await f.until(() => f.state.hits === 1);
  f.state.now += 300001; f.release();
  assert.deepEqual(await result, { ok: false, reason: 'invalid_clock' });
  f.state.mode = 'normal'; assert.ok((await Effect.runPromise(cache.readSnapshot())).ok); assert.equal(f.state.hits, 2);
});


test('concurrent readers share the same refusal without a hidden second retrieval', { timeout: 10000 }, async t => {
  const f = await fixture(t); f.state.mode = 'stall'; const { cache } = await scopedCache(t, f.config);
  const reads = [Effect.runPromise(cache.readSnapshot()), Effect.runPromise(cache.readSnapshot())];
  await f.until(() => f.state.hits === 1); f.state.mode = 'normal'; f.release('{}');
  assert.deepEqual(await Promise.all(reads), [{ ok: false, reason: 'invalid_jwks' }, { ok: false, reason: 'invalid_jwks' }]);
  assert.equal(f.state.hits, 1);
  assert.ok((await Effect.runPromise(cache.readSnapshot())).ok); assert.equal(f.state.hits, 2);
});
