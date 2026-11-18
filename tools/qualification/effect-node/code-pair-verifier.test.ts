import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeCodePairVerifier } from './code-pair-verifier.ts';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'signing-key-cache-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const keys = { old: generateKeyPairSync('rsa', { modulusLength: 2048 }), rotated: generateKeyPairSync('rsa', { modulusLength: 2048 }) };
  const publicKey = (kid: string) => ({ ...keys[kid === 'rotated' ? 'rotated' : 'old'].publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' });
  const state = { now: 1_800_000_000_000, hits: 0, closed: 0, kids: ['old'], mode: 'normal', throwClock: false };
  const pending = new Set<ServerResponse>();
  const body = () => JSON.stringify({ keys: state.kids.map(publicKey) });
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
  function token(profile: 'id' | 'initial-access', changes: object = {}, kid = 'old', header: object | string = { alg: 'RS256', typ: 'JWT', kid }) {
    const claims = { iss: config.issuer, sub: 'engineer', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate', azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', nonce: 'expected', iat: state.now / 1000, exp: state.now / 1000 + 300, ...changes };
    const text = Buffer.from(typeof header === 'string' ? header : JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    return text + '.' + sign('RSA-SHA256', Buffer.from(text), keys[kid === 'rotated' ? 'rotated' : 'old'].privateKey).toString('base64url');
  }
  function request(kid = 'old') { return { nonce: 'expected', requestStartedAtMs: state.now, candidates: { stage: 'unverified-code' as const, idToken: token('id', {}, kid), accessToken: token('initial-access', {}, kid), expiresIn: 300 } }; }
  return { state, config, until, token, request, release: (text = body()) => { for (const response of pending) response.end(text); } };
}

async function verifier(t: TestContext) {
  const f = await fixture(t); const scope = Scope.makeUnsafe();
  t.after(() => Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
  const operation = await Effect.runPromise(Scope.provide(makeCodePairVerifier(f.config), scope));
  return { ...f, operation, scope };
}

test('real resolved keys verify only the captured code context and follow bounded rotation', { timeout: 10000 }, async t => {
  const f = await verifier(t); const request = f.request(); const first = f.operation.verify(request);
  request.nonce = 'changed'; request.candidates.idToken = 'changed';
  assert.deepEqual(await Effect.runPromise(first), { ok: true, issuer: f.config.issuer, subject: 'engineer', validUntilMs: f.state.now + 300000 }); assert.equal(f.state.hits, 1);
  f.state.now += 1000; f.state.kids.push('rotated');
  const pair = f.request('rotated'); pair.candidates.accessToken = f.token('initial-access');
  assert.equal((await Effect.runPromise(f.operation.verify(pair))).ok, true); assert.equal(f.state.hits, 2);
});

test('strict token/context preflight refuses before any signing-key network request', { timeout: 10000 }, async t => {
  const f = await verifier(t);
  for (const header of [{ alg: 'HS256', typ: 'JWT', kid: 'old' }, { alg: 'RS256', typ: 'JWT', kid: 'old', jku: 'https://attacker.invalid/keys' }, '{"alg":"RS256","typ":"JWT","kid":"old","k\\u0069d":"old"}']) {
    const request = f.request(); request.candidates.idToken = f.token('id', {}, 'old', header);
    assert.deepEqual(await Effect.runPromise(f.operation.verify(request)), { ok: false, reason: 'invalid_pair' });
  }
  for (const change of [{ nonce: '' }, { requestStartedAtMs: f.state.now + 1 }, { candidates: { ...f.request().candidates, expiresIn: 301 } }, { candidates: { ...f.request().candidates, accessToken: 'x'.repeat(16385) } }]) {
    assert.deepEqual(await Effect.runPromise(f.operation.verify({ ...f.request(), ...change })), { ok: false, reason: 'invalid_pair' });
  }
  assert.equal(f.state.hits, 0);
});

test('signed subject, issuer, nonce, audience and signature substitution never expose partial identity', { timeout: 10000 }, async t => {
  const f = await verifier(t);
  for (const changes of [{ sub: 'someone-else' }, { iss: 'https://attacker.invalid/realms/perfeng' }, { aud: 'perfeng-control-plane' }]) {
    const request = f.request(); request.candidates.accessToken = f.token('initial-access', changes);
    assert.deepEqual(await Effect.runPromise(f.operation.verify(request)), { ok: false, reason: 'invalid_pair' });
  }
  const nonce = f.request(); nonce.candidates.idToken = f.token('id', { nonce: 'wrong' });
  assert.deepEqual(await Effect.runPromise(f.operation.verify(nonce)), { ok: false, reason: 'invalid_pair' });
  const signature = f.request(); signature.candidates.idToken = f.token('id', {}, 'rotated', { alg: 'RS256', typ: 'JWT', kid: 'old' });
  assert.deepEqual(await Effect.runPromise(f.operation.verify(signature)), { ok: false, reason: 'invalid_pair' }); assert.equal(f.state.hits, 1);
  f.state.throwClock = true; assert.deepEqual(await Effect.runPromise(f.operation.verify(f.request())), { ok: false, reason: 'unavailable' }); assert.equal(f.state.hits, 1);
});

test('expiry during key retrieval and malformed key documents cannot qualify identity', { timeout: 10000 }, async t => {
  const f = await verifier(t); f.state.mode = 'stall'; const request = f.request(); request.candidates.expiresIn = 1;
  const result = Effect.runPromise(f.operation.verify(request)); await f.until(() => f.state.hits === 1); f.state.now += 1000; f.release();
  assert.deepEqual(await result, { ok: false, reason: 'invalid_pair' });
  f.state.now += 300001; const invalid = Effect.runPromise(f.operation.verify(f.request())); await f.until(() => f.state.hits === 2); f.release('{"keys":[]}');
  assert.deepEqual(await invalid, { ok: false, reason: 'unavailable' });
});

test('caller cancellation and owner closure interrupt actual key I/O without late identity', { timeout: 10000 }, async t => {
  const f = await verifier(t); f.state.mode = 'stall';
  const controller = new AbortController(); const first = Effect.runPromise(f.operation.verify(f.request()), { signal: controller.signal });
  await f.until(() => f.state.hits === 1); const refused = assert.rejects(first); controller.abort(); await refused; await f.until(() => f.state.closed === 1);
  f.state.now += 1000; const next = Effect.runPromise(f.operation.verify(f.request())); const closed = assert.rejects(next); await f.until(() => f.state.hits === 2);
  await Effect.runPromise(Scope.close(f.scope, Exit.succeed(undefined)));
  await Promise.race([closed, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('pair owner left key request pending')), 1000); timer.unref(); })]);
  await f.until(() => f.state.closed === 2); f.release(); await assert.rejects(Effect.runPromise(f.operation.verify(f.request()))); assert.equal(f.state.hits, 2);
});


test('the whole pair operation bounds active callers and the deadline closes unresolved key work', { timeout: 10000 }, async t => {
  const f = await verifier(t); f.state.mode = 'stall'; const started = Date.now();
  const calls = Array.from({ length: 32 }, () => Effect.runPromise(f.operation.verify(f.request())));
  await f.until(() => f.state.hits === 1);
  assert.deepEqual(await Effect.runPromise(f.operation.verify(f.request())), { ok: false, reason: 'unavailable' });
  for (const result of await Promise.all(calls)) assert.deepEqual(result, { ok: false, reason: 'deadline' });
  assert.ok(Date.now() - started < 3500); await f.until(() => f.state.closed === 1); assert.equal(f.state.hits, 1);
});

test('a closing parent scope refuses escaped verification before delayed resource cleanup', { timeout: 10000 }, async t => {
  const f = await verifier(t);
  assert.equal((await Effect.runPromise(f.operation.verify(f.request()))).ok, true);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await Effect.runPromise(Scope.addFinalizer(f.scope, Effect.promise(() => gate)));
  const closing = Effect.runPromise(Scope.close(f.scope, Exit.succeed(undefined)));
  try {
    await f.until(() => f.scope.state._tag === 'Closed');
    await assert.rejects(Effect.runPromise(f.operation.verify(f.request())));
  } finally {
    release();
    await closing;
  }
});
