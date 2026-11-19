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
import { makeLoginDelegation } from '#perfeng/bff-login-delegation';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'verified-exchange-'));
  const cert = join(directory, 'cert');
  const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const client = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const delegate = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let initialAccess = '';
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
    if (form.get('grant_type') === 'urn:ietf:params:oauth:grant-type:token-exchange') {
      assert.equal(form.get('subject_token'), initialAccess);
      assert.equal(form.get('client_id'), 'perfeng-console-delegate');
      assert.equal(form.get('audience'), 'perfeng-control-plane');
      const [header, body, signature] = form.get('client_assertion')!.split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + body), delegate.publicKey, Buffer.from(signature!, 'base64url')), true);
      const claims = JSON.parse(Buffer.from(body!, 'base64url').toString());
      assert.equal(claims.iss, 'perfeng-console-delegate');
      assert.equal(claims.aud, issuer + '/protocol/openid-connect/token');
      const reply = () => response.end(JSON.stringify({ access_token: token('access', '', { aud: 'perfeng-control-plane', azp: 'perfeng-console-delegate', sub: state.mode === 'foreign-delegate' ? 'foreign' : 'engineer' }), token_type: 'Bearer', expires_in: 120, issued_token_type: 'urn:ietf:params:oauth:token-type:access_token' }));
      if (state.mode === 'hold-delegation') return hold(response, reply);
      if (state.mode === 'expire-delegation') state.now += 300000;
      reply();
      return;
    }
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
    const id = token('id', state.mode === 'wrong-nonce' ? 'foreign-nonce' : transaction.nonce, state.mode === 'no-hash' ? {} : { at_hash: state.mode === 'wrong-hash' ? 'bad' : hash });
    initialAccess = access;
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
  const config = { issuer, consoleOrigin: 'https://console.example', ca: readFileSync(cert, 'utf8'), delegatePrivateKeyPem: delegate.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(), loginPrivateKeyPem: client.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString() };
  const acquisition = makeLoginDelegation(config, () => state.now);
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

test('consumed login delegates only its exact verified access bytes and preserves Run intent', async t => {
  const f = await fixture(t);
  const attempt = f.attempt({ kind: 'run', runId: 'perf-20260902-120000-abcdef12' });
  const operation = f.owner.complete(attempt.target, attempt.cookies);
  const result = await Effect.runPromise(operation);
  assert.deepEqual(result, { ok: true, stage: 'verified-login-delegation', issuer: f.issuer, subject: 'engineer', validUntilMs: f.state.now + 120000, returnIntent: { kind: 'run', runId: 'perf-20260902-120000-abcdef12' }, clearCookie: '__Host-perfeng_login=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0' });
  assert.equal(f.state.posts, 2);
  assert.equal((await Effect.runPromise(operation)).ok, false);
  assert.equal(f.state.posts, 2);
});

test('invalid original pair never delegates, and a foreign delegated human never succeeds', async t => {
  for (const mode of ['wrong-nonce', 'foreign-delegate']) {
    const f = await fixture(t);
    f.state.mode = mode;
    const attempt = f.attempt();
    const result = await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies));
    assert.equal(result.ok, false);
    assert.equal(f.state.posts, mode === 'wrong-nonce' ? 1 : 2);
    assert.equal(Object.keys(result).some(name => /token|subject|issuer/i.test(name)), false);
  }
});

test('interruption, retirement and source expiry during delegation cannot release late identity', async t => {
  for (const mode of ['cancel', 'stop', 'expire-delegation']) {
    const f = await fixture(t);
    f.state.mode = mode === 'expire-delegation' ? mode : 'hold-delegation';
    const attempt = f.attempt();
    const controller = new AbortController();
    const pending = Effect.runPromiseExit(f.owner.complete(attempt.target, attempt.cookies), { signal: controller.signal });
    if (mode !== 'expire-delegation') {
      await f.until(() => f.held());
      if (mode === 'cancel') controller.abort(); else f.owner.stop();
      f.release();
    }
    const result = await pending;
    assert.ok(result._tag === 'Failure' || !result.value.ok);
    assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies))).ok, false);
    assert.equal(f.state.posts, 2);
  }
});


test('accepted absent-at_hash profile retains exact authenticated-response custody', async t => {
  const f = await fixture(t);
  f.state.mode = 'no-hash';
  const attempt = f.attempt();
  assert.equal((await Effect.runPromise(f.owner.complete(attempt.target, attempt.cookies))).ok, true);
  assert.equal(f.state.posts, 2);
});
