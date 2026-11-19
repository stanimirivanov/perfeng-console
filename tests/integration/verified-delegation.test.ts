import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeVerifiedDelegation } from '#perfeng/bff-verified-delegation';

async function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'delegate-owner-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-out', join(dir, 'cert'), '-keyout', join(dir, 'key')], { stdio: 'ignore' });
  const signing = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const api = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let posts = 0;
  let received = new URLSearchParams();
  let respond = () => {};
  let observed = () => {};
  const seen = new Promise<void>(resolve => { observed = resolve; });
  let hold = false;
  let bad = false;
  const server = createServer({ cert: readFileSync(join(dir, 'cert')), key: readFileSync(join(dir, 'key')) }, async (req, res) => {
    if (req.url?.endsWith('/certs')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ keys: [{ ...api.publicKey.export({ format: 'jwk' }), kid: 'api', use: 'sig', alg: 'RS256' }] })); return; }
    let body = '';
    for await (const chunk of req) body += chunk.toString();
    posts++;
    received = new URLSearchParams(body);
    assert.equal(req.url, '/realms/perfeng/protocol/openid-connect/token');
    respond = () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache' });
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const data = encode({ alg: 'RS256', typ: 'JWT', kid: 'api' }) + '.' + encode({ iss: issuer, sub: bad ? 'foreign' : 'engineer', aud: 'perfeng-control-plane', azp: 'perfeng-console-delegate', typ: 'Bearer', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 });
      const access = data + '.' + sign('RSA-SHA256', Buffer.from(data), api.privateKey).toString('base64url');
      res.end(JSON.stringify({ access_token: access, token_type: 'Bearer', expires_in: 120, issued_token_type: 'urn:ietf:params:oauth:token-type:access_token' }));
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

const context = (issuer: string) => ({ issuer, subject: 'engineer', accessToken: 'initial.access.token', validUntilMs: Date.now() + 60000 });

test('actual delegate exchange and resolved crypto publish only original-human observation', async t => {
  const f = await fixture(t);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeVerifiedDelegation(f.config);
    const source = context(f.config.issuer);
    const attempt = owner.delegate(source);
    const end = source.validUntilMs;
    source.subject = 'substituted';
    source.accessToken = 'mutated';
    assert.equal(f.posts(), 0);
    const result = yield* attempt;
    assert.deepEqual(result, { ok: true, stage: 'verified-delegated-observation', issuer: f.config.issuer, subject: 'engineer', validUntilMs: end });
    assert.equal((yield* attempt).ok, false);
    assert.equal(f.posts(), 1);
    assert.equal(f.form().get('subject_token'), 'initial.access.token');
    assert.equal(f.form().get('client_id'), 'perfeng-console-delegate');
    const [header, body, signature] = f.form().get('client_assertion')!.split('.');
    assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + body), f.signing.publicKey, Buffer.from(signature!, 'base64url')), true);
    const claims = JSON.parse(Buffer.from(body!, 'base64url').toString());
    assert.equal(claims.iss, 'perfeng-console-delegate');
    assert.equal(claims.aud, f.config.issuer + '/protocol/openid-connect/token');
  })));
});

test('signed foreign human refuses without credentials or partial identity', async t => {
  const f = await fixture(t);
  f.bad();
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeVerifiedDelegation(f.config);
    return yield* owner.delegate(context(f.config.issuer));
  })));
  assert.deepEqual(result, { ok: false, reason: 'invalid_token' });
});

test('expired source and closed scope cannot exchange', async t => {
  const f = await fixture(t);
  const owner = await Effect.runPromise(Effect.scoped(makeVerifiedDelegation(f.config)));
  assert.equal((await Effect.runPromise(owner.delegate(context(f.config.issuer)))).ok, false);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeVerifiedDelegation(f.config);
    assert.equal((yield* owner.delegate({ ...context(f.config.issuer), validUntilMs: 0 })).ok, false);
  })));
  assert.equal(f.posts(), 0);
});

test('cancellation, source expiry and retirement during exchange fence late identity', async t => {
  for (const mode of ['cancel', 'retire', 'expire']) {
    const f = await fixture(t);
    f.hold();
    const scope = Scope.makeUnsafe();
    const controller = new AbortController();
    let now = Date.now();
    try {
      const owner = await Effect.runPromise(Scope.provide(makeVerifiedDelegation(f.config, () => now), scope));
      const attempt = owner.delegate({ ...context(f.config.issuer), validUntilMs: now + 60000 });
      const pending = Effect.runPromiseExit(attempt, { signal: controller.signal });
      await f.seen;
      if (mode === 'cancel') controller.abort();
      else if (mode === 'retire') owner.stop();
      else now += 60000;
      f.release();
      const result = await pending;
      assert.ok(result._tag === 'Failure' || !result.value.ok);
      assert.equal((await Effect.runPromise(attempt)).ok, false);
    } finally { controller.abort(); await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))); }
  }
});


test('foreign original issuer refuses before dispatch', async t => {
  const f = await fixture(t);
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeVerifiedDelegation(f.config);
    return yield* owner.delegate({ ...context(f.config.issuer), issuer: 'https://foreign.example/realms/other' });
  })));
  assert.equal(result.ok, false);
  assert.equal(f.posts(), 0);
});
