import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createRunTransport } from '../../src/bff/transport.ts';

const run = JSON.parse(readFileSync('vendor/perfeng-contracts/api/run-management/v1/examples/completed.json', 'utf8'));

test('fixed-origin Run transport enforces credential, TLS and response boundaries', async (t) => {
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
  const server = createServer({
    cert: readFileSync(tls.caFile), key: readFileSync(tls.keyFile),
  }, (request, response) => {
    if (request.url === '/elsewhere') redirectHits++;
    hits++;
    receivedPath = request.url;
    receivedBearer = request.headers.authorization;
    response.setHeader('Content-Type', 'application/json');
    switch (mode) {
      case 'redirect': response.writeHead(302, { Location: '/elsewhere?value=' + token }).end(); break;
      case 'error': response.writeHead(404).end(token); break;
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

  await t.test('maps responses to bounded safe outcomes without logging provider data', async (subtest) => {
    const logs = [subtest.mock.method(console, 'log'), subtest.mock.method(console, 'warn'), subtest.mock.method(console, 'error')];
    for (const [scenario, reason] of [
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

  await t.test('enforces an absolute deadline and cancellation during body reads', async () => {
    mode = 'drip';
    let sentBody = false;
    bodyStarted = () => { sentBody = true; };
    assert.deepEqual(await createRunTransport({ ...config, deadlineMs: 250 }).getRun(run.id), {
      ok: false, reason: 'deadline',
    });
    assert.equal(sentBody, true);
    mode = 'stall';
    const started = Promise.withResolvers<void>();
    bodyStarted = started.resolve;
    const controller = new AbortController();
    const pending = transport.getRun(run.id, controller.signal);
    await started.promise;
    controller.abort(token);
    assert.deepEqual(await pending, { ok: false, reason: 'aborted' });
    const before = hits;
    assert.deepEqual(await transport.getRun(run.id, controller.signal), { ok: false, reason: 'aborted' });
    assert.equal(hits, before);
  });
});
