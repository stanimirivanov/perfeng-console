import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { once } from 'node:events';
import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Effect } from 'effect';
import { createCodeExchange } from '#perfeng/bff-code-exchange';

test('single-use code exchange composes PKCE, client signature, TLS and unverified results without retry or late authority', { timeout: 20000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'perfeng-code-exchange-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cert = join(root, 'tls.pem'); const key = join(root, 'tls.key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', key, '-out', cert], { stdio: 'ignore' });
  chmodSync(cert, 0o600); chmodSync(key, 0o600);
  const client = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pending = new Map<string, string>();
  const token = 'e30.e30.c2ln'; // Synthetic unverified credential, no valid JWT claims.
  const payload = JSON.stringify({ access_token: token, id_token: token, token_type: 'Bearer', expires_in: 300 });
  let hits = 0; let mode = 'valid'; let issuer = ''; let epoch = 1_800_000_000_000;
  let ready = () => {}; let release = () => {}; let peerClosed = () => {};
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, async (request, response) => {
    hits++;
    response.once('close', peerClosed);
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/realms/perfeng/protocol/openid-connect/token');
    let text = ''; for await (const chunk of request) text += chunk.toString();
    const form = new URLSearchParams(text);
    assert.deepEqual([...form.keys()].sort(), ['client_assertion', 'client_assertion_type', 'client_id', 'code', 'code_verifier', 'grant_type', 'redirect_uri']);
    assert.equal(form.get('grant_type'), 'authorization_code');
    assert.equal(form.get('redirect_uri'), 'https://console.example/console/auth/callback');
    assert.equal(form.get('client_id'), 'perfeng-console-login');
    assert.equal(form.get('client_assertion_type'), 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    assert.equal(createHash('sha256').update(form.get('code_verifier')!).digest('base64url'), pending.get(form.get('code')!));
    pending.delete(form.get('code')!);
    const [header, body, signature] = form.get('client_assertion')!.split('.');
    assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + body), client.publicKey, Buffer.from(signature!, 'base64url')), true);
    const claims = JSON.parse(Buffer.from(body!, 'base64url').toString());
    assert.equal(claims.iss, 'perfeng-console-login'); assert.equal(claims.sub, 'perfeng-console-login');
    assert.equal(claims.aud, issuer + '/protocol/openid-connect/token');
    response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('Pragma', 'no-cache');
    if (mode === 'denied') return void response.writeHead(400).end('private-provider-error');
    if (mode === 'bad') return void response.end('{"access_token":"private-error"}');
    if (mode === 'clock-back') epoch -= 1000;
    if (mode === 'hold') { release = () => { response.end(payload); }; ready(); return; }
    response.end(payload);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  issuer = 'https://127.0.0.1:' + address.port + '/realms/perfeng';
  const config = { issuer, consoleOrigin: 'https://console.example', privateKeyPem: client.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), ca: readFileSync(cert, 'utf8'), deadlineMs: 1000 };
  const owner = createCodeExchange(config, () => epoch);
  for (const changed of [{ ca: '' }, { privateKeyPem: 'private-config-canary' }, { consoleOrigin: 'http://console.example' }]) {
    assert.throws(() => createCodeExchange({ ...config, ...changed }), { message: 'Invalid code exchange configuration' });
  }
  t.after(() => owner.stop());
  config.consoleOrigin = 'https://evil.example'; // Construction must own its configuration.
  let sequence = 0;
  function begin() {
    const begun = owner.begin({ kind: 'home' })!;
    const url = new URL(begun.authorizationUrl); const code = 'synthetic-' + sequence++;
    pending.set(code, url.searchParams.get('code_challenge')!);
    return { target: '/console/auth/callback?' + new URLSearchParams({ state: url.searchParams.get('state')!, iss: issuer, code }),
      cookies: [begun.setCookie.split(';')[0]!], nonce: url.searchParams.get('nonce')! };
  }
  const first = begin();
  assert.equal((await Effect.runPromise(owner.complete(first.target, []))).ok, false); assert.equal(hits, 0);
  const operation = owner.complete(first.target, first.cookies); first.cookies[0] = 'forged';
  assert.equal(hits, 0);
  const success = await Effect.runPromise(operation); assert.ok(success.ok);
  assert.equal(success.candidates.stage, 'unverified-code'); assert.equal(success.nonce, first.nonce);
  assert.equal(success.requestStartedAtMs, epoch); assert.deepEqual(success.returnIntent, { kind: 'home' });
  assert.match(success.clearCookie, /Max-Age=0$/);
  assert.equal((await Effect.runPromise(operation)).ok, false); assert.equal(hits, 1);
  for (const value of ['denied', 'bad', 'clock-back']) {
    mode = value; const attempt = begin(); const before: number = hits;
    const result = await Effect.runPromise(owner.complete(attempt.target, attempt.cookies));
    assert.equal(result.ok, false); assert.doesNotMatch(JSON.stringify(result), /private-provider-error|private-error|accessToken/);
    assert.equal((await Effect.runPromise(owner.complete(attempt.target, attempt.cookies))).ok, false); assert.equal(hits, before + 1);
    epoch = 1_800_000_000_000;
  }
  mode = 'valid';
  let failingClock = false;
  const clockOwner = createCodeExchange({ ...config, consoleOrigin: 'https://console.example' }, () => { if (failingClock) throw new Error('private-clock-detail'); return epoch; });
  const clockBegin = clockOwner.begin({ kind: 'home' })!;
  const clockState = new URL(clockBegin.authorizationUrl).searchParams.get('state')!;
  const clockTarget = '/console/auth/callback?' + new URLSearchParams({ state: clockState, iss: issuer, code: 'unused-clock-code' });
  const clockCookies = [clockBegin.setCookie.split(';')[0]!];
  const beforeClock = hits; failingClock = true;
  const clockResult = await Effect.runPromise(clockOwner.complete(clockTarget, clockCookies));
  assert.equal(clockResult.ok, false); assert.doesNotMatch(JSON.stringify(clockResult), /private-clock-detail/);
  failingClock = false; assert.equal((await Effect.runPromise(clockOwner.complete(clockTarget, clockCookies))).ok, false);
  assert.equal(hits, beforeClock); clockOwner.stop();
  mode = 'hold';
  const interrupted = begin(); const controller = new AbortController();
  let started = new Promise<void>(resolve => { ready = resolve; });
  const closed = new Promise<void>(resolve => { peerClosed = resolve; });
  const interruptedResult = Effect.runPromise(owner.complete(interrupted.target, interrupted.cookies), { signal: controller.signal });
  await started; controller.abort(); await assert.rejects(interruptedResult); await closed;
  const before: number = hits;
  assert.equal((await Effect.runPromise(owner.complete(interrupted.target, interrupted.cookies))).ok, false); assert.equal(hits, before);
  const late = begin(); started = new Promise<void>(resolve => { ready = resolve; });
  const lateResult = Effect.runPromise(owner.complete(late.target, late.cookies)); await started;
  owner.stop(); release();
  const retired = await lateResult; assert.equal(retired.ok, false); assert.doesNotMatch(JSON.stringify(retired), /accessToken|idToken/);
  assert.equal(owner.begin({ kind: 'home' }), undefined);
});
