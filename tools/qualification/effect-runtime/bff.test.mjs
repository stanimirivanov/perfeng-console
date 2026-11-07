import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:https';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Effect } from 'effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';

// Admission requirements deliberately remain red where the pinned graph cannot satisfy them.
test('BFF admission: installed Node HTTP adapter resolves', async () => {
  await import('effect/platform-node/NodeHttpClient');
});
test('reference API admission: setSignal exists', () => {
  assert.equal(typeof HttpClientRequest.setSignal, 'function');
});
test('BFF admission: Fetch layer can trust only the supplied CA', { timeout: 10000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'perfeng-effect-tls-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cert = join(root, 'ca.pem'); const key = join(root, 'key.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=local-fixture', '-addext', 'subjectAltName=IP:127.0.0.1',
    '-keyout', key, '-out', cert], { stdio: 'ignore' });
  let hits = 0;
  const server = createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (_req, res) => {
    hits++; res.end('approved');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const client = HttpClient.withScope(yield* HttpClient.HttpClient);
    const response = yield* client.get('https://127.0.0.1:' + server.address().port);
    return yield* response.text;
  })).pipe(
    Effect.timeout(2000), Effect.provide(FetchHttpClient.layer),
    // Deliberately probe the tempting unsupported option. Web RequestInit has no ca field;
    // this JS test demonstrates that adding it does not establish a TLS trust boundary.
    Effect.provideService(FetchHttpClient.RequestInit, { redirect: 'error', ca: readFileSync(cert) }),
    Effect.match({ onFailure: () => 'unavailable', onSuccess: value => value }),
  ));
  assert.equal(hits, 1, 'approved TLS request must reach the server');
  assert.equal(result, 'approved');
});
