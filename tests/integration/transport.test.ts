import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, request as httpsRequest } from 'node:https';
import { get } from 'node:http';
import { fork } from 'node:child_process';
import { startFixtureBff } from './fixtures/transport-lifecycle.ts';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { Effect } from 'effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as NodeHttpClient from '@effect/platform-node/NodeHttpClient';
import { NodeHttpIncomingMessage } from '@effect/platform-node/NodeHttpIncomingMessage';

import { createRunTransport } from '#perfeng/bff';

const artifact = { id: '11111111-1111-4111-8111-111111111111', runId: 'perf-20260902-120000-abcdef12', kind: 'raw', uri: 's3://evidence/fixture', sha256: 'a'.repeat(64), sizeBytes: 42, mediaType: 'application/json', format: 'k6/v1' };
const run = JSON.parse(readFileSync('vendor/perfeng-contracts/api/run-management/v1/examples/completed.json', 'utf8'));

test('fixed-origin Run transport enforces credential, TLS and response boundaries', { timeout: 20000 }, async (t) => {
  const root = mkdtempSync(join(homedir(), '.perfeng-transport-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const token = 'fixture-' + process.pid + '-canary';
  const tokenFile = join(root, 'bearer');
  writeFileSync(tokenFile, token + '\n', { mode: 0o600 });

  function certificate(name: string) {
    const caFile = join(root, name + '.pem');
    const keyFile = join(root, name + '.key');
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=local-fixture', '-addext', 'subjectAltName=IP:127.0.0.1',
      '-keyout', keyFile, '-out', caFile,
    ], { stdio: 'ignore' });
    chmodSync(caFile, 0o600);
    return { caFile, keyFile };
  }
  const tls = certificate('approved');
  const other = certificate('other');
  let mode = 'valid';
  let hits = 0;
  let redirectHits = 0;
  let connections = 0;
  let receivedBearer: string | undefined;
  let receivedPath: string | undefined;
  let bodyStarted = () => {};
  let responseClosed = () => {};
  const waitClose = () => Promise.race([new Promise<void>(resolve => { responseClosed = resolve; }), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('server response not closed')), 2000); timer.unref(); })]);
  const server = createServer({
    cert: readFileSync(tls.caFile), key: readFileSync(tls.keyFile),
  }, (request, response) => {
    if (request.url === '/elsewhere') redirectHits++;
    hits++;
    response.once('close', responseClosed);
    receivedPath = request.url;
    receivedBearer = request.headers.authorization;
    response.setHeader('Content-Type', 'application/json');
    switch (mode) {
      case 'artifacts': response.end(JSON.stringify({ artifacts: [{ ...artifact, runId: run.id }] })); break;
      case 'foreign-artifact': response.end(JSON.stringify({ artifacts: [{ ...artifact, runId: 'perf-20260902-120000-12345678' }] })); break;
      case 'before-headers': bodyStarted(); break;
      case 'redirect': response.writeHead(302, { Location: '/elsewhere?value=' + token }).end(); break;
      case 'error': response.writeHead(404).end(token); break;
      case 'duplicate-same': response.setHeader('Content-Type', ['application/json', 'application/json']); response.end(JSON.stringify(run)); break;
      case 'duplicate-different': response.setHeader('Content-Type', ['application/json', 'text/plain']); response.end(JSON.stringify(run)); break;
      case 'encoding': response.setHeader('Content-Encoding', 'gzip'); response.end(JSON.stringify(run)); break;
      case 'utf8': response.end(Buffer.from([0xff])); break;
      case 'unauthorized': response.writeHead(401).end(token); break;
      case 'forbidden': response.writeHead(403).end(token); break;
      case 'busy': response.writeHead(429).end(token); break;
      case 'server-error': response.writeHead(500).end(token); break;
      case 'wrong-media': response.setHeader('Content-Type', 'text/plain'); response.end(JSON.stringify(run)); break;
      case 'wrong-id': response.end(JSON.stringify({ ...run, id: 'perf-20260902-120000-12345678' })); break;
      case 'invalid': response.end(JSON.stringify({ ...run, extra: token })); break;
      case 'malformed': response.end('{' + token); break;
      case 'oversize': response.write(' '.repeat(4096)); response.end(' '.repeat(4096)); break;
      case 'drip': {
        response.write('{');
        bodyStarted();
        const timer = setInterval(() => response.write(' '), 10);
        response.once('close', () => clearInterval(timer));
        break;
      }
      case 'stall': response.write('{'); bodyStarted(); break;
      default: response.end(JSON.stringify(run));
    }
  });
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  server.on('connection', () => { connections++; });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = 'https://127.0.0.1:' + address.port;
  const config = { origin, tokenFile, caFile: tls.caFile };
  const transport = createRunTransport(config);

  await t.test('artifact reads share the qualified transport and reject foreign Run membership', async () => {
    mode = 'artifacts';
    assert.deepEqual(await transport.listArtifacts(run.id), { ok: true, artifacts: [{ ...artifact, runId: run.id }] });
    assert.equal(receivedPath, '/v1/runs/' + run.id + '/artifacts');
    for (const value of ['foreign-artifact', 'redirect', 'duplicate-same', 'encoding', 'oversize']) {
      mode = value;
      assert.deepEqual(await transport.listArtifacts(run.id), { ok: false, reason: 'invalid_response' });
    }
    mode = 'valid';
  });

  await t.test('reads only the typed operation at the configured destination', async () => {
    assert.deepEqual(await transport.getRun(run.id), { ok: true, run });
    assert.equal(receivedPath, '/v1/runs/' + run.id);
    assert.equal(receivedBearer === 'Bearer ' + token, true);
    const before = hits;
    for (const input of ['https://other.example/', '../elsewhere', '//other.example', '%2felsewhere']) {
      assert.deepEqual(await transport.getRun(input), { ok: false, reason: 'invalid_input' });
    }
    assert.equal(hits, before);
    for (const input of ['http://127.0.0.1', origin + '/elsewhere', origin + '?q=1', 'https://user@127.0.0.1']) {
      assert.throws(() => createRunTransport({ ...config, origin: input }), /^Error: Invalid upstream configuration$/);
    }
  });

  await t.test('fails closed on unsafe credential paths', () => {
    const reject = (path: string) =>
      assert.throws(() => createRunTransport({ ...config, tokenFile: path }), /^Error: Invalid upstream configuration$/);
    chmodSync(tokenFile, 0o640);
    reject(tokenFile);
    chmodSync(tokenFile, 0o600);
    const alias = join(root, 'alias');
    symlinkSync(tokenFile, alias);
    reject(alias);
    const hardlink = join(root, 'hardlink');
    linkSync(tokenFile, hardlink);
    reject(tokenFile);
    rmSync(hardlink);
    const nested = join(root, 'nested');
    mkdirSync(nested);
    chmodSync(nested, 0o777);
    const child = join(nested, 'bearer');
    writeFileSync(child, token, { mode: 0o600 });
    reject(child);
    chmodSync(nested, 0o700);
    const aliasDir = join(root, 'alias-dir');
    symlinkSync(nested, aliasDir);
    reject(join(aliasDir, 'bearer'));
    reject(root);
  });

  await t.test('rejects wrong CA and TLS hostname and never follows a redirect', async () => {
    const before = hits;
    assert.deepEqual(await createRunTransport({ ...config, caFile: other.caFile }).getRun(run.id), {
      ok: false, reason: 'unavailable',
    });
    assert.equal(hits, before);
    const previousConnections = connections;
    assert.deepEqual(await createRunTransport({ ...config, origin: 'https://localhost:' + address.port }).getRun(run.id), {
      ok: false, reason: 'unavailable',
    });
    assert.equal(connections, previousConnections + 1);
    assert.equal(hits, before);
    mode = 'redirect';
    assert.deepEqual(await transport.getRun(run.id), { ok: false, reason: 'invalid_response' });
    assert.equal(redirectHits, 0);
    assert.equal(hits, before + 1);
  });

  await t.test('public Node source preserves both raw and distinct duplicate headers', async () => {
    mode = 'duplicate-same';
    const observed = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const client = HttpClient.withScope(yield* HttpClient.HttpClient);
      const response = yield* client.get(origin);
      assert.ok(response instanceof NodeHttpIncomingMessage);
      return { raw: response.source.rawHeaders, distinct: response.source.headersDistinct['content-type'] };
    })).pipe(Effect.provide(NodeHttpClient.layerNodeHttpOptions({
      ca: readFileSync(tls.caFile), minVersion: 'TLSv1.2', rejectUnauthorized: true,
    }))));
    assert.deepEqual(observed.distinct, ['application/json', 'application/json']);
    assert.equal(observed.raw.filter(value => value.toLowerCase() === 'content-type').length, 2);
  });

  await t.test('maps responses to bounded safe outcomes without logging provider data', async (subtest) => {
    const logs = [subtest.mock.method(console, 'log'), subtest.mock.method(console, 'warn'), subtest.mock.method(console, 'error')];
    for (const [scenario, reason] of [
      ['duplicate-same', 'invalid_response'], ['duplicate-different', 'invalid_response'],
      ['encoding', 'invalid_response'], ['utf8', 'invalid_response'],
      ['unauthorized', 'forbidden'], ['forbidden', 'forbidden'], ['busy', 'unavailable'], ['server-error', 'unavailable'],
      ['error', 'not_found'], ['wrong-media', 'invalid_response'], ['wrong-id', 'invalid_response'],
      ['invalid', 'invalid_response'], ['malformed', 'invalid_response'], ['oversize', 'invalid_response'],
    ]) {
      mode = scenario!;
      const result = await createRunTransport({ ...config, maxResponseBytes: 4096 }).getRun(run.id);
      assert.deepEqual(result, { ok: false, reason });
      assert.equal(JSON.stringify(result).includes(token), false);
    }
    for (const log of logs) assert.equal(log.mock.callCount(), 0);
  });

  await t.test('interrupt before headers closes the wire', async () => {
    mode = 'before-headers';
    const closed = waitClose();
    const started = Promise.withResolvers<void>();
    bodyStarted = started.resolve;
    const controller = new AbortController();
    const pending = transport.getRun(run.id, controller.signal);
    await started.promise; controller.abort();
    assert.deepEqual(await pending, { ok: false, reason: 'aborted' });
    await closed;
  });

  await t.test('enforces an absolute deadline and cancellation during body reads', async () => {
    mode = 'drip';
    const deadlineClosed = waitClose();
    let sentBody = false;
    bodyStarted = () => { sentBody = true; };
    assert.deepEqual(await createRunTransport({ ...config, deadlineMs: 250 }).getRun(run.id), {
      ok: false, reason: 'deadline',
    });
    assert.equal(sentBody, true);
    await deadlineClosed;
    mode = 'stall';
    const closed = waitClose();
    const started = Promise.withResolvers<void>();
    bodyStarted = started.resolve;
    const controller = new AbortController();
    const pending = transport.getRun(run.id, controller.signal);
    await started.promise;
    controller.abort(token);
    assert.deepEqual(await pending, { ok: false, reason: 'aborted' });
    await closed;
    const before = hits;
    assert.deepEqual(await transport.getRun(run.id, controller.signal), { ok: false, reason: 'aborted' });
    assert.equal(hits, before);
  });

  await t.test('TLS 1.1 is rejected while a deliberately permissive control connects', async () => {
    const legacy = createServer({ cert: readFileSync(tls.caFile), key: readFileSync(tls.keyFile),
      minVersion: 'TLSv1.1', maxVersion: 'TLSv1.1', ciphers: 'DEFAULT:@SECLEVEL=0' }, (_req, res) => res.end('control'));
    legacy.listen(0, '127.0.0.1'); await once(legacy, 'listening');
    try {
      const addr = legacy.address(); assert.ok(addr && typeof addr === 'object');
      const url = 'https://127.0.0.1:' + addr.port;
      const control = await new Promise<string>((resolve, reject) => {
        const request = httpsRequest(url, { ca: readFileSync(tls.caFile), minVersion: 'TLSv1.1', maxVersion: 'TLSv1.1', ciphers: 'DEFAULT:@SECLEVEL=0' }, response => {
          let body = ''; response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve(body));
        });
        request.on('error', reject); request.end();
      });
      assert.equal(control, 'control');
      assert.deepEqual(await createRunTransport({ ...config, origin: url }).getRun(run.id), { ok: false, reason: 'unavailable' });
    } finally { legacy.closeAllConnections(); await new Promise<void>(resolve => legacy.close(() => resolve())); }
  });

  await t.test('caller/deadline ordering and simultaneous expiry remain safe', async () => {
    for (const [delay, expected] of [[20, 'aborted'], [450, 'deadline'], [250, undefined]] as const) {
      mode = 'stall'; const closed = waitClose();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(token), delay);
      const result = await createRunTransport({ ...config, deadlineMs: 250 }).getRun(run.id, controller.signal);
      clearTimeout(timer);
      assert.equal(result.ok, false);
      if (!result.ok) {
        if (expected) assert.equal(result.reason, expected);
        else assert.ok(['aborted', 'deadline'].includes(result.reason));
      }
      assert.equal(JSON.stringify(result).includes(token), false); await closed;
    }
  });

  await t.test('incoming BFF disconnect aborts upstream body consumption', async () => {
    mode = 'stall'; const closed = waitClose();
    const started = Promise.withResolvers<void>(); bodyStarted = started.resolve;
    const bff = await startFixtureBff(config, run.id);
    try {
      const request = get(bff.url); request.on('error', () => {});
      await started.promise; request.destroy(); await closed;
      assert.equal(await bff.stop(), 0);
    } finally { await bff.stop(); }
  });

  await t.test('SIGTERM of BFF process drains its active request and closes upstream', async () => {
    mode = 'stall'; const closed = waitClose();
    const started = Promise.withResolvers<void>(); bodyStarted = started.resolve;
    const child = fork(new URL('./fixtures/transport-lifecycle.ts', import.meta.url), [JSON.stringify(config), run.id], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    try {
      const [url] = await once(child, 'message'); assert.equal(typeof url, 'string');
      const request = get(String(url)); request.on('error', () => {});
      await started.promise;
      const exited = once(child, 'exit'); child.kill('SIGTERM');
      await closed;
      const [code, signal] = await exited; assert.equal(code, 0); assert.equal(signal, null);
      request.destroy();
    } finally { if (child.exitCode === null) child.kill('SIGKILL'); }
  });

});
