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
import { spawn } from 'node:child_process';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'signing-key-cache-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=IP:127.0.0.1', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const keys = { old: generateKeyPairSync('rsa', { modulusLength: 2048 }), rotated: generateKeyPairSync('rsa', { modulusLength: 2048 }) };
  const publicKey = (kid: string) => ({ ...keys[kid === 'rotated' ? 'rotated' : 'old'].publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' });
  const state = { now: Math.floor(Date.now() / 1000) * 1000, hits: 0, closed: 0, kids: ['old'], mode: 'normal', throwClock: false };
  const pending = new Set<ServerResponse>();
  const body = () => JSON.stringify({ keys: state.kids.map(publicKey) });
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (req, res) => {
    state.hits++; assert.equal(req.method, 'GET'); assert.equal(req.url, '/realms/perfeng-fixture/protocol/openid-connect/certs');
    res.once('close', () => { state.closed++; pending.delete(res); });
    res.setHeader('Content-Type', 'application/json');
    if (state.mode === 'stall') { pending.add(res); res.write(''); }
    else if (state.mode === 'outage') { res.writeHead(503); res.end('private-provider-body'); }
    else res.end(body());
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const config = { issuer: 'https://127.0.0.1:' + address.port + '/realms/perfeng-fixture', ca: readFileSync(cert, 'utf8'), deadlineMs: 3000, now: () => { if (state.throwClock) throw new Error('private-clock'); return state.now; } };
  async function until(predicate: () => boolean) {
    const deadline = Date.now() + 2000;
    while (!predicate()) { if (Date.now() >= deadline) assert.fail('fixture did not reach expected boundary'); await new Promise(resolve => setTimeout(resolve, 5)); }
  }
  function token(profile: 'id' | 'initial-access', changes: object = {}, kid = 'old', header: object | string = { alg: 'RS256', typ: 'JWT', kid }) {
    const claims = { iss: config.issuer, sub: 'e3295d37-a188-4753-b89c-1ca188d85102', aud: profile === 'id' ? 'perfeng-console-login' : 'perfeng-console-delegate', azp: 'perfeng-console-login', typ: profile === 'id' ? 'ID' : 'Bearer', nonce: 'expected', iat: state.now / 1000, exp: state.now / 1000 + 300, ...changes };
    const text = Buffer.from(typeof header === 'string' ? header : JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    return text + '.' + sign('RSA-SHA256', Buffer.from(text), keys[kid === 'rotated' ? 'rotated' : 'old'].privateKey).toString('base64url');
  }
  function request(kid = 'old') { return { nonce: 'expected', requestStartedAtMs: state.now, candidates: { stage: 'unverified-code' as const, idToken: token('id', {}, kid), accessToken: token('initial-access', {}, kid), expiresIn: 300 } }; }
  return { state, config, until, token, request, release: (text = body()) => { for (const response of pending) response.end(text); } };
}

async function client(input: Buffer, open = false) {
  const child = spawn(process.execPath, ['tools/qualification/effect-node/code-pair-cli.ts'], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000, env: { PATH: process.env.PATH } });
  const output: Buffer[] = []; const errors: Buffer[] = [];
  child.stdout.on('data', data => output.push(data)); child.stderr.on('data', data => errors.push(data));
  child.stdin.on('error', () => {});
  if (open) child.stdin.write(input); else child.stdin.end(input);
  const [status] = await once(child, 'close');
  return { status, output: Buffer.concat(output).toString(), errors: Buffer.concat(errors).toString() };
}
const passed = { profile: 'perfeng-keycloak-code-pair-v1', status: 'PASS', admission: 'NOT_ADMITTED', checks: ['fixed-origin-keys', 'signed-human-code-pair', 'expected-fixture-subject'] };
const failed = { profile: 'perfeng-keycloak-code-pair-v1', status: 'FAIL', admission: 'NOT_ADMITTED' };

test('private stdin qualifier verifies actual TLS/signed credentials and returns only a constant receipt', { timeout: 10000 }, async t => {
  const f = await fixture(t); const payload = { issuer: f.config.issuer, ca: f.config.ca, ...f.request() };
  const result = await client(Buffer.from(JSON.stringify(payload)));
  assert.equal(result.status, 0); assert.equal(result.errors, ''); assert.deepEqual(JSON.parse(result.output), passed); assert.equal(f.state.hits, 1);
});

test('IPC input refuses duplicate, oversized, malformed, foreign and extra fields without credential diagnostics', { timeout: 15000 }, async t => {
  const f = await fixture(t); const payload = { issuer: f.config.issuer, ca: f.config.ca, ...f.request() };
  const valid = JSON.stringify(payload);
  for (const input of [Buffer.from(valid.replace('"nonce":"expected"', '"nonce":"expected","nonce":"SECRET-CANARY"')), Buffer.alloc(65537, 120), Buffer.from([0xff]), Buffer.from(JSON.stringify({ ...payload, issuer: 'https://attacker.invalid/realms/perfeng-fixture' })), Buffer.from(JSON.stringify({ ...payload, password: 'SECRET-CANARY' }))]) {
    const result = await client(input); assert.equal(result.status, 1); assert.equal(result.errors, ''); assert.deepEqual(JSON.parse(result.output), failed); assert.ok(!result.output.includes('SECRET-CANARY'));
  }
  assert.equal(f.state.hits, 0);
});

test('independent expected subject and input deadline cannot be bypassed', { timeout: 10000 }, async t => {
  const f = await fixture(t); const request = f.request(); request.candidates.idToken = f.token('id', { sub: 'unexpected' }); request.candidates.accessToken = f.token('initial-access', { sub: 'unexpected' });
  const result = await client(Buffer.from(JSON.stringify({ issuer: f.config.issuer, ca: f.config.ca, ...request })));
  assert.equal(result.status, 1); assert.deepEqual(JSON.parse(result.output), failed); assert.equal(result.errors, '');
  const started = Date.now(); const stalled = await client(Buffer.from('{"SECRET-CANARY":'), true);
  assert.equal(stalled.status, 1); assert.deepEqual(JSON.parse(stalled.output), failed); assert.equal(stalled.errors, ''); assert.ok(Date.now() - started < 3500);
});
