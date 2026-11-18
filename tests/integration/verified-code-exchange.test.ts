import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeVerifiedCodeExchange } from '#perfeng/bff-verified-exchange';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'verified-exchange-'));
  const cert = join(directory, 'cert');
  const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const client = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const issuerKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = { ...issuerKey.publicKey.export({ format: 'jwk' }), kid: 'reviewed', use: 'sig', alg: 'RS256' };
  const state = { now: 1_800_000_000_000, posts: 0, keys: 0, closed: 0, mode: 'valid' };
  const pending = new Map<string, {
    challenge: string;
    nonce: string;
  }>();
  const replies = new Set<() => void>();
  let issuer = '';
  function token(profile: 'id' | 'access', nonce: string, changes: object = {}) {
    const claims = { iss: issuer, sub: 'engineer', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate', azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', nonce, iat: Math.floor(state.now / 1000), exp: Math.floor(state.now / 1000) + 300, ...changes };
    const text = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'reviewed' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    return text + '.' + sign('RSA-SHA256', Buffer.from(text), issuerKey.privateKey).toString('base64url');
  }
  function hold(response: ServerResponse, reply: () => void) {
    replies.add(reply);
    response.once('close', () => { replies.delete(reply); state.closed++; });
  }
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');
    if (request.url === '/realms/perfeng/protocol/openid-connect/certs') {
      assert.equal(request.method, 'GET');
      state.keys++;
      const reply = () => response.end(JSON.stringify({ keys: [publicKey] }));
      if (state.mode === 'hold-keys') return hold(response, reply);
      if (state.mode === 'expired') state.now += 1001;
      reply();
      return;
    }
    assert.equal(request.url, '/realms/perfeng/protocol/openid-connect/token');
    assert.equal(request.method, 'POST');
    state.posts++;
    let text = '';
    for await (const chunk of request) text += chunk.toString();
    const form = new URLSearchParams(text);
    assert.deepEqual([...form.keys()].sort(), ['client_assertion', 'client_assertion_type', 'client_id', 'code', 'code_verifier', 'grant_type', 'redirect_uri']);
    const transaction = pending.get(form.get('code')!);
    assert.ok(transaction);
    pending.delete(form.get('code')!);
    assert.equal(createHash('sha256').update(form.get('code_verifier')!).digest('base64url'), transaction.challenge);
    assert.equal(form.get('grant_type'), 'authorization_code');
    assert.equal(form.get('redirect_uri'), 'https://console.example/console/auth/callback');
    assert.equal(form.get('client_id'), 'perfeng-console-login');
    const [header, body, signature] = form.get('client_assertion')!.split('.');
    assert.ok(verify('RSA-SHA256', Buffer.from(header + '.' + body), client.publicKey, Buffer.from(signature!, 'base64url')));
    assert.equal(JSON.parse(Buffer.from(body!, 'base64url').toString()).aud, issuer + '/protocol/openid-connect/token');
    if (state.mode === 'denied') { response.writeHead(400); response.end('private-provider-canary'); return; }
    const access = token('access', transaction.nonce, state.mode === 'wrong-subject' ? { sub: 'other' } : {});
    const hash = createHash('sha256').update(access).digest().subarray(0, 16).toString('base64url');
    const id = token('id', state.mode === 'wrong-nonce' ? 'foreign-nonce' : transaction.nonce, { at_hash: state.mode === 'wrong-hash' ? 'bad' : hash });
    const reply = () => response.end(JSON.stringify({ access_token: access, id_token: id, token_type: 'Bearer', expires_in: state.mode === 'expired' ? 1 : 300 }));
    if (state.mode === 'hold-post') return hold(response, reply);
    reply();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  issuer = 'https://127.0.0.1:' + address.port + '/realms/perfeng';
  const scope = Scope.makeUnsafe();
  const config = { issuer, consoleOrigin: 'https://console.example', ca: readFileSync(cert, 'utf8'), privateKeyPem: client.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString() };
  const acquisition = makeVerifiedCodeExchange(config, () => state.now);
  config.issuer = 'https://never-fetch.invalid/realms/attacker';
  const owner = await Effect.runPromise(Scope.provide(acquisition, scope));
  t.after(() => Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
  let sequence = 0;
  function attempt(intent: unknown = { kind: 'home' }) {
    const begun = owner.begin(intent)!;
    const url = new URL(begun.authorizationUrl);
    const code = 'synthetic-' + sequence++;
    pending.set(code, { challenge: url.searchParams.get('code_challenge')!, nonce: url.searchParams.get('nonce')! });
    return { target: '/console/auth/callback?' + new URLSearchParams({ state: url.searchParams.get('state')!, iss: issuer, code }), cookies: [begun.setCookie.split(';')[0]!] };
  }
  async function until(predicate: () => boolean) {
    const end = Date.now() + 2000;
    while (!predicate()) { assert.ok(Date.now() < end, 'boundary not reached'); await new Promise(resolve => setTimeout(resolve, 5)); }
  }
  return { state, owner, scope, issuer, attempt, until, held: () => replies.size > 0, heldCount: () => replies.size, release: () => { for (const reply of replies) { replies.delete(reply); reply(); } } };
}

test('consumed exchange verifies the exact signed response, keeps custody and never replays or exposes credentials', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  const attempt = f.attempt();
  assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, []))).ok, false);
  assert.equal(f.state.posts, 0);
  const operation = f.owner.complete(attempt.target, attempt.cookies);
  attempt.cookies[0] = 'forged';
  assert.equal(f.state.posts, 0);
  const result = await Effect.runPromise(operation);
  assert.deepEqual(result, { ok: true, stage: 'verified-code-observation', issuer: f.issuer, subject: 'engineer', validUntilMs: f.state.now + 300000, returnIntent: { kind: 'home' }, clearCookie: '__Host-perfeng_login=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0' });
  assert.doesNotMatch(JSON.stringify(result), /accessToken|idToken|nonce|candidates|codeVerifier/);
  assert.equal((await Effect.runPromise(operation)).ok, false);
  assert.equal(f.state.posts, 1);
  const concurrent = f.attempt();
  const results = await Promise.all([1, 2].map(() => Effect.runPromise(f.owner.complete(concurrent.target, concurrent.cookies))));
  assert.equal(results.filter(value => value.ok).length, 1);
  assert.equal(f.state.posts, 2);
  assert.equal(f.state.keys, 1);
  const intent = { kind: 'run', runId: 'perf-20260902-120000-abcdef12' };
  const run = f.attempt(intent);
  intent.runId = 'changed';
  const detail = await Effect.runPromise(f.owner.complete(run.target, run.cookies));
  assert.ok(detail.ok);
  assert.deepEqual(detail.returnIntent, { kind: 'run', runId: 'perf-20260902-120000-abcdef12' });
});

test('signed nonce/subject/hash substitution and provider failure burn the attempt without partial identity', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  for (const mode of ['wrong-nonce', 'wrong-subject', 'wrong-hash', 'denied']) {
    f.state.mode = mode;
    const attempt = f.attempt();
    const before = f.state.posts;
    const result = await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, mode === 'denied' ? 'denied' : 'invalid_pair');
    assert.doesNotMatch(JSON.stringify(result), /private-provider-canary|engineer|subject|accessToken|idToken/);
    assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies))).ok, false);
    assert.equal(f.state.posts, before + 1);
  }
});

for (const mode of ['hold-post', 'hold-keys']) test('caller cancellation burns consumed state during ' + mode, { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.state.mode = mode;
  const attempt = f.attempt();
  const controller = new AbortController();
  const result = Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies), { signal: controller.signal });
  const rejected = assert.rejects(result);
  await f.until(() => f.held() && (mode === 'hold-post' ? f.state.posts === 1 : f.state.keys === 1));
  controller.abort();
  await rejected;
  await f.until(() => f.state.closed === 1);
  assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies))).ok, false);
  assert.equal(f.state.posts, 1);
});

test('retirement during POST cannot release late identity, and expired evidence during key retrieval refuses', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.state.mode = 'hold-post';
  const attempt = f.attempt();
  const pending = Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies));
  await f.until(() => f.held() && f.state.posts === 1);
  f.owner.stop(); f.release();
  assert.equal((await pending).ok, false);
  assert.equal(f.state.keys, 0);
  assert.equal(f.owner.begin({ kind: 'home' }), undefined);
  const g = await fixture(t);
  g.state.mode = 'expired';
  const expired = g.attempt();
  assert.equal((await Effect.runPromise(g.owner.complete(expired.target, expired.cookies))).ok, false);
});

test('owner scope closure interrupts key work and escaped completion handles stay retired', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.state.mode = 'hold-keys';
  const attempt = f.attempt();
  const pending = Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies));
  const rejected = assert.rejects(pending);
  await f.until(() => f.held() && f.state.keys === 1);
  await Effect.runPromise(Scope.close(f.scope, Exit.succeed(undefined)));
  await rejected;
  assert.equal(f.owner.begin({ kind: 'home' }), undefined);
  assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies))).ok, false);
});


test('completion capacity refuses excess work before consumption; an unconsumed attempt can retry', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.state.mode = 'hold-post';
  const running = Array.from({ length: 32 }, () => {
    const attempt = f.attempt();
    return Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies));
  });
  try {
    await f.until(() => f.heldCount() === 32);
    const extra = f.attempt();
    const operation = f.owner.complete(extra.target, extra.cookies);
    assert.deepEqual(await Effect.runPromise(operation), { ok: false, reason: 'unavailable' });
    assert.equal(f.state.posts, 32);
    f.release();
    assert.ok((await Promise.all(running)).every(result => result.ok));
    f.state.mode = 'valid';
    assert.equal((await Effect.runPromise(operation)).ok, true);
    assert.equal(f.state.posts, 33);
  } finally {
    f.release();
    await Promise.all(running);
  }
});

test('scope closing refuses late POST results even while another finalizer delays cleanup', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.state.mode = 'hold-post';
  const attempt = f.attempt();
  const pending = Effect.runPromiseExit(f.owner.complete(attempt.target, attempt.cookies));
  await f.until(() => f.held());
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await Effect.runPromise(Scope.addFinalizer(f.scope, Effect.promise(() => gate)));
  const closing = Effect.runPromise(Scope.close(f.scope, Exit.succeed(undefined)));
  try {
    await f.until(() => f.scope.state._tag === 'Closed');
    f.release();
    const result = await pending;
    if (Exit.isSuccess(result)) assert.equal(result.value.ok, false);
    assert.equal(f.owner.begin({ kind: 'home' }), undefined);
  } finally {
    release(); f.release();
    await closing;
    await pending;
  }
});
