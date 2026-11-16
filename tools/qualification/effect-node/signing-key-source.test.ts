import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Effect } from 'effect';
import { createSigningKeySource } from './signing-key-source.ts';

test('real signing-key wire and decoder bind only captured issuer and retrieval time', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'signing-key-source-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const publicKey = { ...generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' }), kid: 'published', use: 'sig', alg: 'RS256' };
  let body = JSON.stringify({ keys: [publicKey, { kid: 'encryption', kty: 'RSA', use: 'enc', alg: 'RSA-OAEP' }] });
  let hits = 0; let stall = false; let ready = () => {}; let closed = () => {};
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (req, res) => {
    hits++; assert.equal(req.method, 'GET'); assert.equal(req.url, '/realms/perfeng/protocol/openid-connect/certs'); assert.equal(req.headers.authorization, undefined);
    res.once('close', closed); res.setHeader('Content-Type', 'application/json');
    if (stall) { res.write('{'); ready(); } else res.end(body);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const issuer = 'https://127.0.0.1:' + address.port + '/realms/perfeng';
  const start = 1_800_000_000_000;
  let observations: (number | 'throw')[] = [start, start + 1000]; let clockCalls = 0;
  const config = { issuer, ca: readFileSync(cert, 'utf8'), deadlineMs: 1000, now: () => { clockCalls++; const value = observations.shift(); if (value === 'throw' || value === undefined) throw new Error('private-clock-canary'); return value; } };
  const source = createSigningKeySource(config);
  const pending = source.load(); assert.equal(hits, 0); assert.equal(clockCalls, 0);
  config.issuer = 'https://never-fetch.invalid/realms/attacker'; config.ca = ''; config.deadlineMs = 99999; config.now = () => 0;
  const result = await Effect.runPromise(pending);
  assert.ok(result.ok); assert.equal(result.snapshot.issuer, issuer); assert.equal(result.snapshot.fetchedAtMs, start); assert.deepEqual(result.snapshot.keys.map(value => value.kid), ['published']); assert.ok(Object.isFrozen(result.snapshot));
  for (const invalid of ['{', '{"keys":[],"keys":[]}', JSON.stringify({ keys: [{ ...publicKey, d: 'private-key-canary' }] }), JSON.stringify({ keys: [publicKey], fetchedAtMs: start + 999999 })]) {
    body = invalid; observations = [start, start + 1000];
    assert.deepEqual(await Effect.runPromise(source.load()), { ok: false, reason: 'invalid_jwks' });
  }
  body = JSON.stringify({ keys: [publicKey] });
  for (const values of [[NaN], [-1], ['throw'], [start, NaN], [start, start - 1], [start, start + 300001], [start, 'throw']] as (number | 'throw')[][]) {
    observations = [...values]; const before: number = hits;
    assert.deepEqual(await Effect.runPromise(source.load()), { ok: false, reason: 'invalid_clock' });
    if (values.length === 1) assert.equal(hits, before);
  }
  for (const cancel of [false, true]) {
    stall = true; observations = [start, start + 1];
    const started = new Promise<void>(resolve => { ready = resolve; }); const released = new Promise<void>(resolve => { closed = resolve; });
    const controller = new AbortController(); const work = Effect.runPromise(source.load(), { signal: controller.signal });
    await started;
    if (cancel) { controller.abort(); await assert.rejects(work); } else assert.deepEqual(await work, { ok: false, reason: 'deadline' });
    await Promise.race([released, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('scope did not close')), 1000); timer.unref(); })]);
  }
});
