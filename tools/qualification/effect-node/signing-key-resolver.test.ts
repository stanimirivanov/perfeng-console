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
import { makeSigningKeyResolver } from './signing-key-resolver.ts';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'signing-key-cache-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const publicKey = { ...generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' }), kid: 'old', use: 'sig', alg: 'RS256' };
  const state = { now: 1_800_000_000_000, hits: 0, closed: 0, kids: ['old'], mode: 'normal', throwClock: false };
  const pending = new Set<ServerResponse>();
  const body = () => JSON.stringify({ keys: state.kids.map(kid => ({ ...publicKey, kid })) });
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

async function resolver(t: TestContext) {
  const f = await fixture(t); const scope = Scope.makeUnsafe();
  t.after(() => Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
  const keys = await Effect.runPromise(Scope.provide(makeSigningKeyResolver(f.config), scope));
  return { ...f, keys, scope };
}

test('resolver refreshes unknown-key rotation once and never trusts malformed IDs', { timeout: 10000 }, async t => {
  const f = await resolver(t);
  for (const kid of [null, 1, '', 'x'.repeat(129)]) assert.deepEqual(await Effect.runPromise(f.keys.resolveKey(kid)), { ok: false, reason: 'invalid_key_id' });
  assert.equal(f.state.hits, 0);
  const old = await Effect.runPromise(f.keys.resolveKey('old')); assert.ok(old.ok); assert.equal(old.key.kid, 'old'); assert.ok(Object.isFrozen(old.key)); assert.equal(f.state.hits, 1);
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('missing')), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, 1);
  f.state.now += 1000; f.state.kids.push('new');
  const rotated = await Effect.runPromise(f.keys.resolveKey('new')); assert.ok(rotated.ok); assert.equal(rotated.key.kid, 'new'); assert.equal(rotated.fetchedAtMs, f.state.now); assert.equal(f.state.hits, 2);
});

test('shared failed refresh preserves fresh known keys and attempts are rate limited', { timeout: 10000 }, async t => {
  const f = await resolver(t); assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok); f.state.now += 1000; f.state.mode = 'stall';
  const misses = ['a', 'b'].map(kid => Effect.runPromise(f.keys.resolveKey(kid))); await f.until(() => f.state.hits === 2);
  assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok); assert.equal(f.state.hits, 2);
  f.release('{}');
  for (const result of await Promise.all(misses)) assert.deepEqual(result, { ok: false, reason: 'invalid_jwks' });
  assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok);
  f.state.mode = 'normal';
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('a')), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, 2);
  f.state.now += 1000; f.state.kids.push('a'); assert.ok((await Effect.runPromise(f.keys.resolveKey('a'))).ok); assert.equal(f.state.hits, 3);
});

test('negative misses are bounded, expire and yield to a newer admitted generation', { timeout: 10000 }, async t => {
  const f = await resolver(t); assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok); f.state.now += 1000; f.state.mode = 'stall';
  const names = Array.from({ length: 32 }, (_, index) => 'absent-' + index);
  const misses = names.map(kid => Effect.runPromise(f.keys.resolveKey(kid))); await f.until(() => f.state.hits === 2); f.release();
  assert.deepEqual(await Promise.all(misses), names.map(() => ({ ok: false, reason: 'unknown_key' }))); assert.equal(f.state.hits, 2);
  f.state.mode = 'normal'; f.state.now += 1000;
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey(names[0]!)), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, 2);
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('absent-32')), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, 3);
  f.state.now += 1000; assert.deepEqual(await Effect.runPromise(f.keys.resolveKey(names[0]!)), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, 4);
  f.state.now += 1000; f.state.kids.push(names[2]!); assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('trigger')), { ok: false, reason: 'unknown_key' });
  assert.ok((await Effect.runPromise(f.keys.resolveKey(names[2]!))).ok);
  const before = f.state.hits; f.state.now += 30001;
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('trigger')), { ok: false, reason: 'unknown_key' }); assert.equal(f.state.hits, before + 1);
});

test('resolver overload and scope shutdown do not orphan shared refresh work', { timeout: 10000 }, async t => {
  const f = await resolver(t); assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok); f.state.now += 1000; f.state.mode = 'stall';
  const controllers = Array.from({ length: 32 }, () => new AbortController());
  const reads = controllers.map((controller, index) => Effect.runPromise(f.keys.resolveKey('new-' + index), { signal: controller.signal }));
  await f.until(() => f.state.hits === 2);
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('extra')), { ok: false, reason: 'unavailable' });
  const one = assert.rejects(reads[0]!); controllers[0]!.abort(); await one; assert.equal(f.state.closed, 1);
  const refused = reads.slice(1).map(read => assert.rejects(read));
  await Effect.runPromise(Scope.close(f.scope, Exit.succeed(undefined)));
  await Promise.race([Promise.all(refused), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('resolver scope left refresh pending')), 1000); timer.unref(); })]);
  await f.until(() => f.state.closed === 2); f.release();
  await assert.rejects(Effect.runPromise(f.keys.resolveKey('old'))); assert.equal(f.state.hits, 2);
});

test('total request deadline and stale-source refusal never return expired known keys', { timeout: 10000 }, async t => {
  const f = await resolver(t); assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok); f.state.now += 300001; f.state.mode = 'outage';
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('old')), { ok: false, reason: 'unavailable' });
  f.state.now += 1000; f.state.mode = 'stall'; const started = Date.now();
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('old')), { ok: false, reason: 'deadline' }); assert.ok(Date.now() - started < 3500);
  await f.until(() => f.state.closed === f.state.hits);
});


test('stale primary reads cannot overlap miss refresh and clock rollback never returns authority', { timeout: 10000 }, async t => {
  const f = await resolver(t); assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok);
  f.state.now += 1000; f.state.mode = 'stall';
  const miss = Effect.runPromise(f.keys.resolveKey('new')); await f.until(() => f.state.hits === 2);
  f.state.now += 300001;
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('old')), { ok: false, reason: 'unavailable' }); assert.equal(f.state.hits, 2);
  f.release(); assert.deepEqual(await miss, { ok: false, reason: 'invalid_clock' });
  f.state.mode = 'normal'; f.state.now += 1000; assert.ok((await Effect.runPromise(f.keys.resolveKey('old'))).ok);
  f.state.now--; assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('old')), { ok: false, reason: 'invalid_clock' });
  const before = f.state.hits; f.state.throwClock = true;
  assert.deepEqual(await Effect.runPromise(f.keys.resolveKey('old')), { ok: false, reason: 'invalid_clock' }); assert.equal(f.state.hits, before);
});
