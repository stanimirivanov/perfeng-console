import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeDelegatedExchange } from '#perfeng/bff-delegate-owner';

async function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'delegate-owner-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-out', join(dir, 'cert'), '-keyout', join(dir, 'key')], { stdio: 'ignore' });
  const signing = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let posts = 0;
  let received = new URLSearchParams();
  let respond = () => {};
  let observed = () => {};
  const seen = new Promise<void>(resolve => { observed = resolve; });
  let hold = false;
  let bad = false;
  const server = createServer({ cert: readFileSync(join(dir, 'cert')), key: readFileSync(join(dir, 'key')) }, async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk.toString();
    posts++;
    received = new URLSearchParams(body);
    assert.equal(req.url, '/realms/perfeng/protocol/openid-connect/token');
    respond = () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache' });
      res.end(JSON.stringify(bad ? { access_token: 'private-canary' } : { access_token: 'candidate.access.token', token_type: 'Bearer', expires_in: 120, issued_token_type: 'urn:ietf:params:oauth:token-type:access_token' }));
    };
    observed();
    if (!hold) respond();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const issuer = `https://127.0.0.1:${address.port}/realms/perfeng`;
  const config = { issuer, ca: readFileSync(join(dir, 'cert'), 'utf8'), privateKeyPem: signing.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString() };
  return { config, signing, posts: () => posts, form: () => received, seen, release: () => respond(), hold: () => { hold = true; }, bad: () => { bad = true; } };
}

test('real qualified TLS POST uses the delegate signer and admits only private candidates once', async t => {
  const f = await fixture(t);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedExchange(f.config);
    const attempt = owner.exchange('initial.access.token', Date.now() + 60000);
    assert.equal(f.posts(), 0);
    const result = yield* attempt;
    assert.deepEqual(result.ok && result.candidates, { stage: 'unverified-delegated', accessToken: 'candidate.access.token', expiresIn: 120 });
    assert.equal((yield* attempt).ok, false);
    assert.equal(f.posts(), 1);
    const form = f.form();
    assert.equal(form.get('client_id'), 'perfeng-console-delegate');
    assert.equal(form.get('audience'), 'perfeng-control-plane');
    assert.equal(form.get('subject_token'), 'initial.access.token');
    const [header, body, signature] = form.get('client_assertion')!.split('.');
    assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + body), f.signing.publicKey, Buffer.from(signature!, 'base64url')), true);
    const claims = JSON.parse(Buffer.from(body!, 'base64url').toString());
    assert.equal(claims.iss, 'perfeng-console-delegate');
    assert.equal(claims.sub, claims.iss);
    assert.equal(claims.aud, f.config.issuer + '/protocol/openid-connect/token');
  })));
});

test('closed scope and explicit retirement never dispatch', async t => {
  const f = await fixture(t);
  const closed = await Effect.runPromise(Effect.scoped(makeDelegatedExchange(f.config)));
  assert.equal((await Effect.runPromise(closed.exchange('initial.access.token', Date.now() + 60000))).ok, false);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedExchange(f.config);
    owner.stop();
    assert.equal((yield* owner.exchange('initial.access.token', Date.now() + 60000)).ok, false);
  })));
  assert.equal(f.posts(), 0);
});

test('actual invalid envelope never publishes candidates', async t => {
  const f = await fixture(t);
  f.bad();
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedExchange(f.config);
    return yield* owner.exchange('initial.access.token', Date.now() + 60000);
  })));
  assert.deepEqual(result, { ok: false, reason: 'invalid_response' });
});

test('retirement and cancellation during actual POST fence late results and replay', async t => {
  for (const cancel of [false, true]) {
    const f = await fixture(t);
    f.hold();
    const scope = await Effect.runPromise(Scope.make());
    t.after(() => Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))));
    const owner = await Effect.runPromise(makeDelegatedExchange(f.config).pipe(Scope.provide(scope)));
    const attempt = owner.exchange('initial.access.token', Date.now() + 60000);
    const controller = new AbortController();
    const pending = Effect.runPromiseExit(attempt, { signal: controller.signal });
    await f.seen;
    if (cancel) controller.abort(); else owner.stop();
    f.release();
    const result = await pending;
    if (cancel) assert.equal(result._tag, 'Failure');
    else assert.equal(result._tag === 'Success' && result.value.ok, false);
    assert.equal((await Effect.runPromise(attempt)).ok, false);
    assert.equal(f.posts(), 1);
  }
});

test('held actual POST reaches the qualified deadline without retry', async t => {
  const f = await fixture(t);
  f.hold();
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedExchange({ ...f.config, deadlineMs: 100 });
    const attempt = owner.exchange('initial.access.token', Date.now() + 60000);
    const result = yield* attempt;
    assert.equal((yield* attempt).ok, false);
    return result;
  })));
  assert.deepEqual(result, { ok: false, reason: 'deadline' });
  assert.equal(f.posts(), 1);
});

test('capacity refuses a 33rd caller while earlier real POSTs are held', async t => {
  const f = await fixture(t);
  f.hold();
  const scope = await Effect.runPromise(Scope.make());
  const controller = new AbortController();
  try {
    const owner = await Effect.runPromise(Scope.provide(makeDelegatedExchange(f.config), scope));
    const pending = Array.from({ length: 32 }, () => Effect.runPromiseExit(owner.exchange('initial.access.token', Date.now() + 60000), { signal: controller.signal }));
    try {
      await f.seen;
      assert.deepEqual(await Effect.runPromise(owner.exchange('initial.access.token', Date.now() + 60000)), { ok: false, reason: 'unavailable' });
    } finally {
      controller.abort();
      await Promise.all(pending);
    }
    assert.ok(f.posts() <= 32);
  } finally {
    controller.abort();
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
  }
});
