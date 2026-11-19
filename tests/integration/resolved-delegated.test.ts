import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeDelegatedVerifier } from '#perfeng/bff-resolved-delegated';

async function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'resolved-delegated-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-out', join(dir, 'cert'), '-keyout', join(dir, 'key')], { stdio: 'ignore' });
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'reviewed', use: 'sig', alg: 'RS256' };
  let gets = 0;
  let hold = false;
  let release = () => {};
  let observed = () => {};
  const seen = new Promise<void>(resolve => { observed = resolve; });
  const server = createServer({ cert: readFileSync(join(dir, 'cert')), key: readFileSync(join(dir, 'key')) }, (req, res) => {
    gets++;
    assert.equal(req.url, '/realms/perfeng/protocol/openid-connect/certs');
    release = () => { if (res.headersSent || res.destroyed) return; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ keys: [key] })); };
    observed();
    if (!hold) release();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const issuer = `https://127.0.0.1:${address.port}/realms/perfeng`;
  const now = Date.now();
  const token = (changes: object = {}) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const data = encode({ alg: 'RS256', typ: 'JWT', kid: 'reviewed' }) + '.' + encode({ iss: issuer, sub: 'engineer', aud: 'perfeng-control-plane', azp: 'perfeng-console-delegate', typ: 'Bearer', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 300, ...changes });
    return data + '.' + sign('RSA-SHA256', Buffer.from(data), pair.privateKey).toString('base64url');
  };
  return { issuer, now, config: { issuer, ca: readFileSync(join(dir, 'cert'), 'utf8'), now: () => now }, request: () => ({ token: token(), subject: 'engineer', requestStartedAtMs: now, expiresIn: 120 }), token, gets: () => gets, hold: () => { hold = true; }, release: () => release(), seen };
}

test('actual TLS resolution verifies delegated binding and shares fresh keys', async t => {
  const f = await fixture(t);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedVerifier(f.config);
    for (let n = 0; n < 2; n++) assert.deepEqual(yield* owner.verify(f.request()), { ok: true, issuer: f.issuer, subject: 'engineer', validUntilMs: f.now + 120000 });
    assert.equal(f.gets(), 1);
    assert.equal((yield* owner.verify({ ...f.request(), token: f.token({ sub: 'foreign' }) })).ok, false);
    assert.equal((yield* owner.verify({ ...f.request(), token: f.token({ azp: 'perfeng-console-login' }) })).ok, false);
  })));
});

test('bad response context and malformed selector refuse before key I/O', async t => {
  const f = await fixture(t);
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedVerifier(f.config);
    for (const change of [{ token: 'malformed' }, { subject: '' }, { expiresIn: 0 }, { expiresIn: 301 }, { requestStartedAtMs: f.now + 1 }, { requestStartedAtMs: f.now - 120000 }]) assert.equal((yield* owner.verify({ ...f.request(), ...change })).ok, false);
  })));
  assert.equal(f.gets(), 0);
});

test('cancelled or closed owner never publishes a late key result', async t => {
  for (const close of [false, true]) {
    const f = await fixture(t);
    f.hold();
    const scope = Scope.makeUnsafe();
    const controller = new AbortController();
    try {
      const owner = await Effect.runPromise(Scope.provide(makeDelegatedVerifier(f.config), scope));
      const pending = Effect.runPromiseExit(owner.verify(f.request()), { signal: controller.signal });
      await f.seen;
      if (close) await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))); else controller.abort();
      f.release();
      assert.equal((await pending)._tag, 'Failure');
    } finally { controller.abort(); f.release(); await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))); }
  }
});

test('whole-verification budget refuses a held key endpoint', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  f.hold();
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedVerifier(f.config);
    return yield* owner.verify(f.request());
  })));
  assert.deepEqual(result, { ok: false, reason: 'deadline' });
  assert.equal(f.gets(), 1);
});

test('wrong explicit CA cannot establish delegated identity', async t => {
  const f = await fixture(t);
  const other = await fixture(t);
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const owner = yield* makeDelegatedVerifier({ ...f.config, ca: other.config.ca });
    return yield* owner.verify(f.request());
  })));
  assert.equal(result.ok, false);
  assert.equal(f.gets(), 0);
});
