import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect } from 'node:tls';
import { test } from 'node:test';
import { startConsole } from '#perfeng/server';

async function withConsole(check: (fixture: {
  code: string;
  headers: string[];
  send: (headers: string[], body?: string, path?: string, method?: 'GET' | 'POST') => Promise<{
    status: number | undefined;
    text: string;
  }>;
  received: () => number;
  reads: () => number;
}) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'request-policy-'));
  const cert = join(directory, 'cert'); const key = join(directory, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-out', cert, '-keyout', key], { stdio: 'ignore' });
  let received = 0; let reads = 0;
  const reader = async () => { reads++; return { ok: false as const, reason: 'unavailable' as const }; };
  const local = await startConsole({ cert: readFileSync(cert), key: readFileSync(key), port: 0, runs: { getRun: reader, listArtifacts: reader } });
  local.server.prependListener('request', () => { received++; });
  const authority = new URL(local.origin).host;
  const headers = ['Host: ' + authority, 'Origin: ' + local.origin, 'X-Perfeng-CSRF: pair', 'Content-Type: application/json'];
  async function send(fields: string[], body = '', path = '/console/api/session/pair', method: 'GET' | 'POST' = 'POST') {
    return await new Promise<{
      status: number | undefined;
      text: string;
    }>((resolve, reject) => {
      const socket = connect({ host: '127.0.0.1', port: Number(new URL(local.origin).port), rejectUnauthorized: false }, () => {
        // TLS writes preserve raw duplicate field lines; no client header normalization occurs.
        socket.write(method + ' ' + path + ' HTTP/1.1\r\n' + fields.join('\r\n') + '\r\nContent-Length: ' + Buffer.byteLength(body) + '\r\nConnection: close\r\n\r\n' + body);
      });
      let text = '';
      socket.setEncoding('utf8'); socket.on('data', value => { text += value; });
      socket.on('error', reject);
      socket.setTimeout(2000, () => socket.destroy(new Error('Raw HTTPS response timed out')));
      socket.on('close', () => resolve({ status: /^HTTP\/1\.1 (\d+)/.exec(text)?.[1] ? Number(/^HTTP\/1\.1 (\d+)/.exec(text)![1]) : undefined, text }));
    });
  }
  try { await check({ code: local.code, headers, send, received: () => received, reads: () => reads }); }
  finally { local.server.closeAllConnections(); await new Promise<void>(resolve => local.server.close(() => resolve())); rmSync(directory, { recursive: true, force: true }); }
}

for (const field of ['Host', 'Origin', 'X-Perfeng-CSRF']) {
  test('raw duplicate ' + field + ' reaches application admission and is denied', { timeout: 5000 }, async () => {
    await withConsole(async ({ code, headers, send, received }) => {
      const duplicate = headers.find(value => value.startsWith(field + ':'))!;
      assert.equal((await send([...headers, duplicate], JSON.stringify({ code }))).status, 403);
      assert.equal(received(), 1, 'application observes the request; this is not parser rejection');
      assert.equal((await send(headers, JSON.stringify({ code }))).status, 200, 'denial does not consume the pairing code');
    });
  });
}

test('duplicate Content-Length is rejected by Node before application admission', { timeout: 5000 }, async () => {
  await withConsole(async ({ headers, send, received }) => {
    assert.equal((await send([...headers, 'Content-Length: 0'])).status, 400);
    assert.equal(received(), 0);
  });
});

for (const firstJson of [true, false]) {
  test('duplicate Content-Type retains Node first-value behavior: JSON first=' + firstJson, { timeout: 5000 }, async () => {
    await withConsole(async ({ code, headers, send, received }) => {
      const fields = headers.filter(value => !value.startsWith('Content-Type:'));
      const media = firstJson ? ['application/json', 'text/plain'] : ['text/plain', 'application/json'];
      const result = await send([...fields, ...media.map(value => 'Content-Type: ' + value)], JSON.stringify({ code }));
      assert.equal(result.status, firstJson ? 200 : 403);
      assert.equal(received(), 1);
    });
  });
}

for (const media of [undefined, 'text/plain', 'application/json; charset=utf-8']) {
  test('pairing rejects the current unsupported media profile: ' + String(media), { timeout: 5000 }, async () => {
    await withConsole(async ({ code, headers, send }) => {
      const fields = headers.filter(value => !value.startsWith('Content-Type:'));
      if (media) fields.push('Content-Type: ' + media);
      assert.equal((await send(fields, JSON.stringify({ code }))).status, 403);
      assert.equal((await send(headers, JSON.stringify({ code }))).status, 200);
    });
  });
}

for (const bytes of [256, 257]) {
  test('pairing body at ' + bytes + ' bytes preserves the existing wire boundary', { timeout: 5000 }, async () => {
    await withConsole(async ({ code, headers, send }) => {
      const value = JSON.stringify({ code });
      const body = value + ' '.repeat(bytes - Buffer.byteLength(value));
      assert.equal(Buffer.byteLength(body), bytes);
      const result = await send(headers, body);
      if (bytes === 256) assert.equal(result.status, 200);
      else {
        assert.equal(result.status, undefined, 'over-limit request is destroyed, not converted to a 413 response');
        assert.equal(result.text, '');
        assert.equal((await send(headers, value)).status, 200, 'oversized input never consumes the code');
      }
    });
  });
}

test('duplicate cookie values do not select an authenticated session', { timeout: 5000 }, async () => {
  await withConsole(async ({ code, headers, send, reads }) => {
    const paired = await send(headers, JSON.stringify({ code }));
    assert.equal(paired.status, 200);
    const cookie = /^Set-Cookie: ([^;\r\n]+)/im.exec(paired.text)![1]!;
    for (const cookies of [['Cookie: ' + cookie + '; ' + cookie], ['Cookie: ' + cookie, 'Cookie: ' + cookie]]) {
      const fields = headers.filter(value => !value.startsWith('X-Perfeng-CSRF:'));
      fields.push('X-Perfeng-CSRF: read', ...cookies);
      const result = await send(fields, '', '/console/api/runs/perf-20260902-120000-abcdef12', 'GET');
      assert.equal(result.status, 401);
    }
    assert.equal(reads(), 0);
    const admitted = headers.filter(value => !value.startsWith('X-Perfeng-CSRF:'));
    admitted.push('X-Perfeng-CSRF: read', 'Cookie: ' + cookie);
    assert.equal((await send(admitted, '', '/console/api/runs/perf-20260902-120000-abcdef12', 'GET')).status, 503);
    assert.equal(reads(), 1);
  });
});
