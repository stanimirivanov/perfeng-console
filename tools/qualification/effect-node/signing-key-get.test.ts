import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { createServer as createProxy } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Effect } from 'effect';
import { createSigningKeyGet } from './signing-key-get.ts';

test('signing-key GET qualifies fixed endpoint, strict TLS, wire limits and scoped cleanup', { timeout: 20000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'perfeng-key-get-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function certificate(name: string, san = 'IP:127.0.0.1') {
    const key = join(root, name + '.key'); const cert = join(root, name + '.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=' + san, '-keyout', key, '-out', cert], { stdio: 'ignore' });
    chmodSync(key, 0o600); chmodSync(cert, 0o600);
    return { key: readFileSync(key), cert: readFileSync(cert, 'utf8') };
  }
  const tls = certificate('approved'); const wrong = certificate('other');
  let mode = 'valid'; let hits = 0; let redirects = 0;
  let started = () => {}; let closed = () => {};
  const server = createServer(tls, async (request, response) => {
    hits++;
    response.once('close', closed);
    if (request.url !== '/realms/perfeng/protocol/openid-connect/certs') redirects++;
    assert.equal(request.method, 'GET');
    assert.equal(request.headers['content-type'], undefined);
    assert.equal(request.headers.accept, 'application/json');
    assert.equal(request.headers.authorization, undefined);
    let body = ''; for await (const chunk of request) body += chunk.toString();
    assert.equal(body, '');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('Pragma', 'no-cache');
    switch (mode) {
      case 'redirect': response.writeHead(302, { Location: '/decoy' }).end(); break;
      case 'denied': response.writeHead(403).end('private-provider-detail'); break;
      case 'unavailable': response.writeHead(503).end('private-provider-detail'); break;
      case 'duplicate-length': response.setHeader('Content-Length', ['2', '2']); response.end('{}'); break;
      case 'duplicate': response.setHeader('Content-Type', ['application/json', 'application/json']); response.end('{}'); break;
      case 'malformed-length': response.setHeader('Content-Length', 'not-a-number'); response.end('{}'); break;
      case 'peer-close': response.write('{'); response.flushHeaders(); setImmediate(() => response.destroy()); break;
      case 'chunked-exact': response.write('x'.repeat(512)); response.end('x'.repeat(512)); break;
      case 'overflow-stall': response.write('x'.repeat(1025)); started(); break;
      case 'cache-absent': response.removeHeader('Cache-Control'); response.removeHeader('Pragma'); response.end('{}'); break;
      case 'media': response.setHeader('Content-Type', 'text/plain'); response.end('{}'); break;
      case 'chunked-large': response.write('x'.repeat(512)); response.end('x'.repeat(513)); break;
      case 'exact-limit': response.end('x'.repeat(1024)); break;
      case 'empty': response.end(); break;
      case 'encoding': response.setHeader('Content-Encoding', 'gzip'); response.end('{}'); break;
      case 'utf8': response.end(Buffer.from([0xff])); break;
      case 'large': response.end('x'.repeat(1025)); break;
      case 'many-headers': response.setHeader('X-Repeated', Array(140).fill('x')); response.end('{}'); break;
      case 'headers': response.setHeader('X-Large', 'x'.repeat(17000)); response.end('{}'); break;
      case 'stall': response.write('{'); started(); break;
      case 'before-headers': started(); break;
      default: response.end('{"keys":[]}');
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const issuer = 'https://127.0.0.1:' + address.port + '/realms/perfeng';
  const config = { issuer, ca: tls.cert, deadlineMs: 1000, maxResponseBytes: 1024 };
  const moduleUrl = new URL('./signing-key-get.ts', import.meta.url).href;
  const oversizedParser = "import { createSigningKeyGet } from " + JSON.stringify(moduleUrl) + "; try { createSigningKeyGet(" + JSON.stringify(config) + "); process.exitCode = 1; } catch (error) { if (error.message !== 'Invalid signing-key transport configuration') throw error; }";
  execFileSync(process.execPath, ['--max-http-header-size=32768', '--input-type=module', '-e', oversizedParser], { stdio: 'pipe' });
  const transport = createSigningKeyGet(config);
  const lazy = transport.get(); assert.equal(hits, 0);
  assert.deepEqual(await Effect.runPromise(lazy), { ok: true, stage: 'unverified-jwks', body: '{"keys":[]}' });
  assert.equal(hits, 1);
  for (const [value, reason] of [['redirect', 'invalid_response'], ['denied', 'unavailable'], ['unavailable', 'unavailable'], ['duplicate', 'invalid_response'], ['duplicate-length', 'unavailable'], ['malformed-length', 'unavailable'], ['peer-close', 'unavailable'], ['media', 'invalid_response'], ['chunked-large', 'invalid_response'], ['empty', 'invalid_response'], ['encoding', 'invalid_response'], ['utf8', 'invalid_response'], ['large', 'invalid_response'], ['many-headers', 'invalid_response'], ['headers', 'unavailable']] as const) {
    mode = value; const priorHits: number = hits;
    const result = await Effect.runPromise(transport.get());
    assert.deepEqual(result, { ok: false, reason }); assert.equal(hits, priorHits + 1);
    assert.doesNotMatch(JSON.stringify(result), /private-provider-detail|fixture-secret/);
  }
  assert.equal(redirects, 0);
  mode = 'exact-limit';
  assert.deepEqual(await Effect.runPromise(transport.get()), { ok: true, stage: 'unverified-jwks', body: 'x'.repeat(1024) });
  const mutable = { ...config }; const captured = createSigningKeyGet(mutable);
  mutable.issuer = 'https://never-fetch.invalid/realms/changed'; mutable.ca = ''; mutable.deadlineMs = 999999; mutable.maxResponseBytes = 999999;
  mode = 'valid';
  assert.ok((await Effect.runPromise(captured.get())).ok);
  mode = 'valid';
  for (const exact of ['exact-limit', 'chunked-exact']) {
    mode = exact;
    assert.deepEqual(await Effect.runPromise(transport.get()), { ok: true, stage: 'unverified-jwks', body: 'x'.repeat(1024) });
  }
  mode = 'cache-absent';
  assert.deepEqual(await Effect.runPromise(transport.get()), { ok: true, stage: 'unverified-jwks', body: '{}' });
  mode = 'overflow-stall';
  const overflowStarted = new Promise<void>(resolve => { started = resolve; });
  const overflowClosed = new Promise<void>(resolve => { closed = resolve; });
  const overflow = Effect.runPromise(transport.get());
  await overflowStarted;
  assert.deepEqual(await overflow, { ok: false, reason: 'invalid_response' });
  await Promise.race([overflowClosed, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('overflow response not closed')), 2000); timer.unref(); })]);
  mode = 'valid';
  let proxyHits = 0;
  const proxy = createProxy((_request, response) => { proxyHits++; response.writeHead(500).end(); });
  proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
  t.after(() => { proxy.closeAllConnections(); return new Promise<void>(resolve => proxy.close(() => resolve())); });
  const proxyAddress = proxy.address(); assert.ok(proxyAddress && typeof proxyAddress === 'object');
  const names = ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'https_proxy', 'http_proxy', 'all_proxy', 'NO_PROXY', 'no_proxy'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) process.env[name] = name.toLowerCase() === 'no_proxy' ? '' : 'http://127.0.0.1:' + proxyAddress.port;
    assert.ok((await Effect.runPromise(transport.get())).ok);
    assert.equal(proxyHits, 0);
  } finally {
    for (const name of names) if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
  }
  const hostname = certificate('hostname', 'DNS:wrong.example');
  let hostnameHits = 0;
  const mismatch = createServer(hostname, (_request, response) => { hostnameHits++; response.end(); });
  mismatch.listen(0, '127.0.0.1'); await once(mismatch, 'listening');
  t.after(() => { mismatch.closeAllConnections(); return new Promise<void>(resolve => mismatch.close(() => resolve())); });
  const mismatchAddress = mismatch.address(); assert.ok(mismatchAddress && typeof mismatchAddress === 'object');
  assert.deepEqual(await Effect.runPromise(createSigningKeyGet({ ...config, issuer: 'https://127.0.0.1:' + mismatchAddress.port + '/realms/perfeng', ca: hostname.cert }).get()), { ok: false, reason: 'unavailable' });
  assert.equal(hostnameHits, 0);
  const beforeTLS = hits;
  assert.deepEqual(await Effect.runPromise(createSigningKeyGet({ ...config, ca: wrong.cert }).get()), { ok: false, reason: 'unavailable' });
  assert.equal(hits, beforeTLS);
  for (const phase of ['before-headers', 'stall']) for (const abort of [false, true]) {
    mode = phase;
    const controller = new AbortController();
    const ready = new Promise<void>(resolve => { started = resolve; });
    const ended = new Promise<void>(resolve => { closed = resolve; });
    const result = Effect.runPromise(createSigningKeyGet({ ...config, deadlineMs: 500 }).get(), { signal: controller.signal });
    await ready;
    if (abort) { controller.abort(); await assert.rejects(result); }
    else assert.deepEqual(await result, { ok: false, reason: 'deadline' });
    await Promise.race([ended, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('response not closed')), 2000); timer.unref(); })]);
  }
  const preAbort = new AbortController(); preAbort.abort(); const before = hits;
  await assert.rejects(Effect.runPromise(transport.get(), { signal: preAbort.signal }));
  assert.equal(hits, before);
  for (const change of [{ issuer: issuer + '/' }, { issuer: issuer.replace('https://', 'https://user:pass@') }, { issuer: issuer + '#fragment' }, { issuer: 'http://127.0.0.1/realms/perfeng' }, { issuer: issuer + '?private=canary' }, { ca: '' }, { deadlineMs: 3001 }, { deadlineMs: 0 }, { maxResponseBytes: 65537 }, { maxResponseBytes: 0 }]) {
    assert.throws(() => createSigningKeyGet({ ...config, ...change }), { message: 'Invalid signing-key transport configuration' });
  }
});
