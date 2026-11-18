import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Effect, Exit, Scope } from 'effect';
import { makeSigningKeyResolver } from '#perfeng/bff-key-resolver';

test('production resolver owns fixed trust, reuses immutable keys, rotates and refuses stale authority on outage', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'bff-key-source-'));
  const cert = join(directory, 'cert');
  const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const publicKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' });
  const state = { now: 1_800_000_000_000, hits: 0, keys: ['old'], outage: false };
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (request, response) => {
    state.hits++;
    assert.equal(request.method, 'GET');
    assert.equal(request.url, '/realms/perfeng/protocol/openid-connect/certs');
    assert.equal(request.headers.authorization, undefined);
    response.setHeader('Content-Type', 'application/json');
    if (state.outage) { response.writeHead(503); response.end('private-provider-canary'); }
    else response.end(JSON.stringify({ keys: state.keys.map(kid => ({ ...publicKey, kid, use: 'sig', alg: 'RS256' })) }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const issuer = 'https://127.0.0.1:' + address.port + '/realms/perfeng';
  const config = { issuer, ca: readFileSync(cert, 'utf8'), now: () => state.now };
  const acquisition = makeSigningKeyResolver(config);
  config.issuer = 'https://never-fetch.invalid/realms/attacker';
  config.ca = '';
  const scope = Scope.makeUnsafe();
  try {
    const resolver = await Effect.runPromise(Scope.provide(acquisition, scope));
    assert.equal(state.hits, 0);
    const first = await Effect.runPromise(resolver.resolveKey('old'));
    assert.ok(first.ok);
    assert.equal(first.issuer, issuer);
    assert.equal(first.fetchedAtMs, state.now);
    assert.ok(Object.isFrozen(first.key));
    assert.equal((await Effect.runPromise(resolver.resolveKey('old'))).ok, true);
    assert.equal(state.hits, 1);
    state.now += 1001;
    state.keys.push('new');
    assert.equal((await Effect.runPromise(resolver.resolveKey('new'))).ok, true);
    assert.equal((await Effect.runPromise(resolver.resolveKey('old'))).ok, true);
    assert.equal(state.hits, 2);
    state.now += 300001;
    state.outage = true;
    assert.deepEqual(await Effect.runPromise(resolver.resolveKey('old')), { ok: false, reason: 'unavailable' });
    assert.equal(state.hits, 3);
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
    await assert.rejects(Effect.runPromise(resolver.resolveKey('old')));
    assert.equal(state.hits, 3);
  } finally {
    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)));
  }
});
